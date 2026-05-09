"""
Unit tests for generate_verdict() and the full check_claim() pipeline.

All external calls (Bedrock, Elasticsearch) are mocked.
"""

import json
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from agent import generate_verdict, check_claim


def _bedrock_verdict_client(verdict_input: dict) -> MagicMock:
    body = json.dumps(
        {
            "content": [
                {
                    "type": "tool_use",
                    "name": "submit_verdict",
                    "input": verdict_input,
                }
            ]
        }
    )
    mock = MagicMock()
    mock.invoke_model.return_value = {"body": BytesIO(body.encode())}
    return mock


def _bedrock_query_client(query_text: str) -> MagicMock:
    body = json.dumps({"content": [{"type": "text", "text": query_text}]})
    mock = MagicMock()
    mock.invoke_model.return_value = {"body": BytesIO(body.encode())}
    return mock


def _reranker_client(scores: list[int]) -> MagicMock:
    body = json.dumps({"content": [{"type": "text", "text": json.dumps(scores)}]})
    mock = MagicMock()
    mock.invoke_model.return_value = {"body": BytesIO(body.encode())}
    return mock


# ---------------------------------------------------------------------------
# generate_verdict tests
# ---------------------------------------------------------------------------


def test_generate_verdict_returns_correct_schema(sample_passages, mock_bedrock_verdict_response):
    verdict_input = mock_bedrock_verdict_response["content"][0]["input"]
    client = _bedrock_verdict_client(verdict_input)

    result = generate_verdict(
        '[CLAIM TO VERIFY]: """BMRCL is shutting the Purple Line"""',
        sample_passages[:1],
        bedrock_client=client,
    )
    assert result["verdict"] in {"SUPPORTED", "REFUTED", "UNVERIFIED", "MANGLED"}
    assert 0.0 <= result["confidence"] <= 1.0
    assert isinstance(result["summary"], str)
    assert isinstance(result["citations"], list)


def test_generate_verdict_mangled_case(sample_passages):
    verdict_input = {
        "verdict": "MANGLED",
        "confidence": 0.87,
        "summary": "Partial suspension, not full shutdown.",
        "citations": [
            {
                "source": "The Hindu BLR",
                "url": "",
                "excerpt": "two hours on May 10",
                "date": "2026-05-08",
            }
        ],
    }
    client = _bedrock_verdict_client(verdict_input)
    result = generate_verdict(
        '[CLAIM TO VERIFY]: """BMRCL is shutting the entire Purple Line"""',
        sample_passages[:1],
        bedrock_client=client,
    )
    assert result["verdict"] == "MANGLED"
    assert result["confidence"] == 0.87
    # URL should be backfilled from ES passage
    assert result["citations"][0]["url"] == sample_passages[0]["url"]


def test_generate_verdict_backfills_missing_url(sample_passages):
    verdict_input = {
        "verdict": "SUPPORTED",
        "confidence": 0.9,
        "summary": "Water supply disruption confirmed.",
        "citations": [{"source": "BWSSB", "url": "", "excerpt": "6-hour disruption", "date": ""}],
    }
    client = _bedrock_verdict_client(verdict_input)
    result = generate_verdict("claim", sample_passages[1:2], bedrock_client=client)
    assert result["citations"][0]["url"] == sample_passages[1]["url"]
    assert result["citations"][0]["date"] == sample_passages[1]["published_at"]


# ---------------------------------------------------------------------------
# check_claim full pipeline tests
# ---------------------------------------------------------------------------


def test_check_claim_unverified_when_no_results():
    with (
        patch("agent._bedrock", return_value=_bedrock_query_client("metro purple line")),
        patch("agent.hybrid_search", return_value=[]),
    ):
        result = check_claim("BMRCL is shutting the Purple Line on Tuesday")

    assert result["verdict"] == "UNVERIFIED"
    assert result["confidence"] == 0.0
    assert result["citations"] == []


def test_check_claim_returns_query_field(sample_passages):
    verdict_input = {
        "verdict": "MANGLED",
        "confidence": 0.87,
        "summary": "Partial suspension, not full line.",
        "citations": [],
    }

    with (
        patch("agent.extract_query", return_value="metro purple line"),
        patch("agent.hybrid_search", return_value=sample_passages),
        patch("agent.rerank", return_value=sample_passages[:1]),
        patch("agent.generate_verdict", return_value={**verdict_input, "citations": []}),
    ):
        result = check_claim("BMRCL is shutting the Purple Line on Tuesday")

    assert "query" in result
    assert result["query"] == "metro purple line"


def test_check_claim_verdict_schema_always_valid(sample_passages):
    verdict_input = {
        "verdict": "SUPPORTED",
        "confidence": 0.95,
        "summary": "Claim confirmed.",
        "citations": [
            {
                "source": "The Hindu BLR",
                "url": "https://example.com",
                "excerpt": "confirmed",
                "date": "2026-05-08",
            }
        ],
    }

    with (
        patch("agent.extract_query", return_value="civic claim bengaluru"),
        patch("agent.hybrid_search", return_value=sample_passages),
        patch("agent.rerank", return_value=sample_passages[:1]),
        patch("agent.generate_verdict", return_value={**verdict_input}),
    ):
        result = check_claim("Some civic claim")

    assert result["verdict"] in {"SUPPORTED", "REFUTED", "UNVERIFIED", "MANGLED"}
    assert 0.0 <= result["confidence"] <= 1.0
