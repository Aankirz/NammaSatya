"""
Shared fixtures. All tests run without live Elasticsearch or Bedrock.
"""

import json
import os
import pytest

# Set dummy env vars so agent.py imports without KeyError
os.environ.setdefault("ES_URL", "https://localhost:9200")
os.environ.setdefault("ES_API_KEY", "test_key")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "test")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("BEDROCK_MODEL_ID", "anthropic.claude-sonnet-4-5")
os.environ.setdefault("RERANKER_MODEL_ID", "anthropic.claude-haiku-4-5-20251001")
os.environ.setdefault("ES_INDEX", "nammasatya-claims")


@pytest.fixture
def sample_passages() -> list[dict]:
    return [
        {
            "title": "Bengaluru Metro Purple Line partial suspension",
            "body": (
                "Bengaluru Metro to suspend Purple Line services for two hours on May 10 "
                "between Hosahalli and Cubbon Park, 7am–9am, for maintenance work."
            ),
            "url": "https://www.thehindu.com/news/cities/bangalore/metro-purple-line-suspension",
            "source_name": "The Hindu BLR",
            "source_type": "news",
            "published_at": "2026-05-08T10:00:00Z",
            "indexed_at": "2026-05-08T10:05:00Z",
        },
        {
            "title": "BWSSB water supply disruption",
            "body": "BWSSB announces 6-hour water supply disruption in North Bengaluru on May 12.",
            "url": "https://bwssb.gov.in/notice-board/water-disruption-may12",
            "source_name": "BWSSB",
            "source_type": "official",
            "published_at": "2026-05-07T08:00:00Z",
            "indexed_at": "2026-05-07T09:00:00Z",
        },
    ]


@pytest.fixture
def mock_bedrock_verdict_response() -> dict:
    """Simulates Bedrock tool-use response for generate_verdict."""
    return {
        "content": [
            {
                "type": "tool_use",
                "name": "submit_verdict",
                "input": {
                    "verdict": "MANGLED",
                    "confidence": 0.87,
                    "summary": (
                        "The Purple Line is not being shut entirely — only a 2-hour partial "
                        "suspension between two stations on May 10."
                    ),
                    "citations": [
                        {
                            "source": "The Hindu BLR",
                            "url": "https://www.thehindu.com/news/cities/bangalore/metro-purple-line-suspension",
                            "excerpt": "suspend Purple Line services for two hours on May 10 between Hosahalli and Cubbon Park",
                            "date": "2026-05-08",
                        }
                    ],
                },
            }
        ]
    }


@pytest.fixture
def mock_bedrock_reranker_response() -> dict:
    """Simulates Bedrock response for rerank (JSON int array)."""
    return {
        "content": [
            {"type": "text", "text": "[95, 30]"}
        ]
    }
