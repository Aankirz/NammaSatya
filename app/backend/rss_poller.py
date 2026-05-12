"""
RSS Poller — runs forever, polling feeds every 5 minutes.

Feeds indexed:
  - The Hindu Bengaluru
  - The Hindu Karnataka
  - Citizen Matters

Deduplicates by URL (SHA-256 doc ID). Failures per feed are logged
and skipped; other feeds continue unaffected.

Run:
    python rss_poller.py
    python rss_poller.py &   # background
"""

import hashlib
import logging
import os
import time
from datetime import datetime, timezone

import feedparser
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from elasticsearch import Elasticsearch

load_dotenv()

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

RSS_FEEDS: list[tuple[str, str]] = [
    (
        "The Hindu BLR",
        "https://www.thehindu.com/news/cities/bangalore/feeder/default.rss",
    ),
    (
        "The Hindu Karnataka",
        "https://www.thehindu.com/news/national/karnataka/feeder/default.rss",
    ),
    ("Citizen Matters", "https://citizenmatters.in/feed/"),
]

INDEX = os.environ.get("ES_INDEX", "nammasatya-claims")
POLL_INTERVAL = int(os.environ.get("RSS_POLL_INTERVAL", "300"))  # seconds


def doc_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def strip_html(raw: str) -> str:
    return BeautifulSoup(raw, "html.parser").get_text(separator=" ", strip=True)


def parse_body(entry: feedparser.FeedParserDict) -> str:
    summary = entry.get("summary", "")
    if not summary:
        content_list = entry.get("content", [])
        summary = content_list[0].get("value", "") if content_list else ""
    return strip_html(summary)


def ingest_feed(es: Elasticsearch, name: str, url: str) -> int:
    feed = feedparser.parse(url)
    if feed.bozo and not feed.entries:
        raise ValueError(f"Feed parse error: {feed.bozo_exception}")

    count = 0
    for entry in feed.entries:
        entry_url = entry.get("link", "")
        if not entry_url:
            continue

        body = parse_body(entry)
        published_raw = entry.get("published", "")
        try:
            published_at = (
                datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                if entry.get("published_parsed")
                else datetime.now(timezone.utc).isoformat()
            )
        except Exception:
            published_at = datetime.now(timezone.utc).isoformat()

        doc = {
            "title": entry.get("title", ""),
            "body": body,
            "url": entry_url,
            "source_name": name,
            "source_type": "news",
            "published_at": published_at,
            "indexed_at": datetime.now(timezone.utc).isoformat(),
        }
        es.index(index=INDEX, id=doc_id(entry_url), document=doc)
        count += 1

    return count


def main() -> None:
    es = Elasticsearch(os.environ["ES_URL"], api_key=os.environ["ES_API_KEY"])
    log.info("RSS poller started. Poll interval: %ds", POLL_INTERVAL)

    while True:
        for name, url in RSS_FEEDS:
            try:
                n = ingest_feed(es, name, url)
                log.info("[%s] indexed %d articles", name, n)
            except Exception as exc:
                log.error("[%s] FAILED: %s", name, exc)

        log.info("Sleeping %ds until next poll.", POLL_INTERVAL)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
