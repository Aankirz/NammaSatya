import os
import time
import hashlib
from datetime import datetime, timezone

import feedparser
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

RSS_FEEDS = [
    ("The Hindu BLR",       "https://www.thehindu.com/news/cities/bangalore/feeder/default.rss"),
    ("The Hindu Karnataka", "https://www.thehindu.com/news/national/karnataka/feeder/default.rss"),
    ("Citizen Matters",     "https://citizenmatters.in/feed/"),
]

INDEX = "blr-truth-check"
POLL_INTERVAL = 300  # 5 minutes


def doc_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def ingest_feed(es: Elasticsearch, name: str, url: str) -> int:
    feed = feedparser.parse(url)
    count = 0
    for entry in feed.entries:
        body = entry.get("summary", "") or entry.get("content", [{}])[0].get("value", "")
        doc = {
            "title":        entry.get("title", ""),
            "body":         body,
            "url":          entry.get("link", ""),
            "source_name":  name,
            "source_type":  "news",
            "published_at": entry.get("published", datetime.now(timezone.utc).isoformat()),
            "indexed_at":   datetime.now(timezone.utc).isoformat(),
        }
        es.index(index=INDEX, id=doc_id(doc["url"]), document=doc)
        count += 1
    return count


def main():
    es = Elasticsearch(os.environ["ES_URL"], api_key=os.environ["ES_API_KEY"])
    while True:
        for name, url in RSS_FEEDS:
            try:
                n = ingest_feed(es, name, url)
                print(f"[{name}] indexed {n} articles")
            except Exception as e:
                print(f"[{name}] FAILED: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
