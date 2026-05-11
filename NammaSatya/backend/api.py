"""
NammaSatya FastAPI server.

Endpoints:
    POST /check          — run the full fact-checking pipeline
    GET  /health         — liveness probe
    GET  /index/stats    — document count per source (for dashboard widgets)

Run:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os
import re
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from agent import check_claim

log = logging.getLogger(__name__)
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NammaSatya API",
    description="Bengaluru misinformation detection agent",
    version="1.0.0",
)

cors_origins = ["*"] if os.environ.get("CORS_ALLOW_ALL", "true").lower() == "true" else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# In-memory claim tracking (process lifetime; resets on restart)
# ---------------------------------------------------------------------------

_lock = threading.Lock()

# date-string → count  (UTC date, resets naturally as date rolls over)
_claims_by_day: dict[str, int] = defaultdict(int)

# last 5 hourly buckets for the sparkline trend
_claims_hourly: deque[tuple[str, int]] = deque(maxlen=50)  # (hour_str, count)

_verdict_counts: dict[str, int] = defaultdict(int)

# each entry: {snippet, source, patterns, at}
_injection_log: deque[dict] = deque(maxlen=20)

_INJECTION_CHECKS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"ignore\s+previous\s+instructions", re.I), "Ignore previous instructions"),
    (re.compile(r"<\s*system\s*[>/]", re.I), "<system> tag"),
    (re.compile(r"override\s*:", re.I), "Override: directive"),
    (re.compile(r"<\s*script\s*[>/]", re.I), "<script> tag"),
    (re.compile(r"javascript\s*:", re.I), "javascript: URI"),
    (re.compile(r"you\s+are\s+now\s+an?\s+", re.I), "Persona override"),
    (re.compile(r"disregard\s+(all\s+)?previous", re.I), "Disregard previous"),
]


def _detect_injection(claim: str) -> list[str]:
    return [label for pattern, label in _INJECTION_CHECKS if pattern.search(claim)]


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _utc_hour() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")


def _record_claim(claim: str, verdict: str) -> None:
    today = _utc_today()
    hour = _utc_hour()

    injections = _detect_injection(claim)

    with _lock:
        _claims_by_day[today] += 1

        # upsert hourly bucket
        if _claims_hourly and _claims_hourly[-1][0] == hour:
            prev_h, prev_n = _claims_hourly[-1]
            _claims_hourly[-1] = (prev_h, prev_n + 1)
        else:
            _claims_hourly.append((hour, 1))

        _verdict_counts[verdict] += 1

        if injections:
            _injection_log.appendleft({
                "snippet": claim[:100],
                "source": "claim input",
                "patterns": injections,
                "at": datetime.now(timezone.utc).isoformat(),
            })


def _live_claims_stats() -> dict:
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    cutoff_24h = (now - timedelta(hours=24)).isoformat()

    with _lock:
        claims_today = _claims_by_day[today]

        # build sparkline: last 5 hourly buckets (or zeros)
        hourly_snapshot = list(_claims_hourly)
        trend = [n for _, n in hourly_snapshot[-5:]] or [0]

        total_verdicts = sum(_verdict_counts.values()) or 1
        verdict_dist = [
            {
                "v": v,
                "n": _verdict_counts[v],
                "pct": round(_verdict_counts[v] / total_verdicts, 4),
            }
            for v in ["SUPPORTED", "REFUTED", "UNVERIFIED", "MANGLED"]
        ]

        # injections in last 24 h
        recent_injections = [e for e in _injection_log if e["at"] >= cutoff_24h]
        injection_examples = [
            {"snippet": e["snippet"], "source": ", ".join(e["patterns"])}
            for e in recent_injections[:3]
        ]

    return {
        "claims_today": claims_today,
        "claims_trend": trend,
        "verdict_dist": verdict_dist,
        "injection": {
            "blocked24h": len(recent_injections),
            "examples": injection_examples,
        },
    }


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


class CheckRequest(BaseModel):
    claim: str = Field(..., min_length=5, max_length=2000, description="Raw claim text to verify")


class Citation(BaseModel):
    source: str
    url: str
    excerpt: str = ""
    date: str = ""
    indexed_at: str = ""


class CheckResponse(BaseModel):
    verdict: str
    confidence: float
    summary: str
    citations: list[Citation]
    query: str
    checked_at: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/check", response_model=CheckResponse, tags=["agent"])
def check(req: CheckRequest) -> CheckResponse:
    """
    Run the NammaSatya fact-checking pipeline against the claim.

    Returns a structured verdict with citations from verified sources.
    """
    log.info("Checking claim (len=%d): %r…", len(req.claim), req.claim[:80])
    try:
        result = check_claim(req.claim)
    except Exception as exc:
        log.exception("Pipeline error")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}") from exc

    _record_claim(req.claim, result["verdict"])

    citations = [
        Citation(
            source=c.get("source", ""),
            url=c.get("url", ""),
            excerpt=c.get("excerpt", ""),
            date=c.get("date", ""),
            indexed_at=c.get("indexed_at", ""),
        )
        for c in result.get("citations", [])
    ]

    return CheckResponse(
        verdict=result["verdict"],
        confidence=result["confidence"],
        summary=result["summary"],
        citations=citations,
        query=result.get("query", ""),
        checked_at=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/index/stats", tags=["ops"])
def index_stats() -> dict:
    """Return document counts per source — for Kibana-style dashboard widgets."""
    from elasticsearch import Elasticsearch

    es = Elasticsearch(os.environ["ES_URL"], api_key=os.environ["ES_API_KEY"])
    index = os.environ.get("ES_INDEX", "nammasatya-claims")

    agg_resp = es.search(
        index=index,
        body={
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {"field": "source_name", "size": 20}
                },
                "by_type": {
                    "terms": {"field": "source_type", "size": 5}
                },
                "by_day": {
                    "date_histogram": {
                        "field": "indexed_at",
                        "calendar_interval": "day",
                        "format": "MMM d",
                        "min_doc_count": 0,
                        "extended_bounds": {
                            "min": "now-13d/d",
                            "max": "now/d",
                        },
                    },
                    "aggs": {
                        "by_type": {"terms": {"field": "source_type", "size": 5}}
                    },
                },
            },
        },
    )
    total = agg_resp["hits"]["total"]["value"]
    by_source = {
        b["key"]: b["doc_count"]
        for b in agg_resp["aggregations"]["by_source"]["buckets"]
    }
    by_type = {
        b["key"]: b["doc_count"]
        for b in agg_resp["aggregations"]["by_type"]["buckets"]
    }

    by_day_buckets = agg_resp["aggregations"]["by_day"]["buckets"]
    timeline = [
        {
            "label": b["key_as_string"],
            "total": b["doc_count"],
            "news": next(
                (t["doc_count"] for t in b["by_type"]["buckets"] if t["key"] == "news"), 0
            ),
            "official": next(
                (t["doc_count"] for t in b["by_type"]["buckets"] if t["key"] == "official"), 0
            ),
        }
        for b in by_day_buckets
    ]

    return {
        "total_documents": total,
        "by_source": by_source,
        "by_type": by_type,
        "timeline": timeline,
        "index": index,
        "as_of": datetime.now(timezone.utc).isoformat(),
        **_live_claims_stats(),
    }
