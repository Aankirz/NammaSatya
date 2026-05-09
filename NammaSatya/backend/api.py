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
from datetime import datetime, timezone

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

    return {
        "total_documents": total,
        "by_source": by_source,
        "by_type": by_type,
        "index": index,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }
