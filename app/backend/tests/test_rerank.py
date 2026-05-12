"""
Unit tests for agent.rerank().

All Bedrock calls are mocked. Tests verify:
  - happy path: top-5 returned in score order
  - fallback: ES order used on Bedrock timeout / bad JSON
  - empty passages handled gracefully
"""

import json
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from agent import rerank


def _mock_client(scores: list[int]) -> MagicMock:
    body = json.dumps({"content": [{"type": "text", "text": json.dumps(scores)}]})
    mock = MagicMock()
    mock.invoke_model.return_value = {"body": BytesIO(body.encode())}
    return mock


def test_returns_top5_sorted_by_score(sample_passages):
    # 2 passages; first gets score 10, second 90 → second should come first
    client = _mock_client([10, 90])
    result = rerank("metro purple line", sample_passages, bedrock_client=client)
    assert len(result) == 2
    assert result[0] == sample_passages[1]  # higher score
    assert result[1] == sample_passages[0]


def test_truncates_to_5():
    passages = [
        {"body": f"passage {i}", "source_name": "src", "source_type": "news",
         "url": f"http://x/{i}", "published_at": "2026-01-01", "indexed_at": "2026-01-01"}
        for i in range(10)
    ]
    scores = [30 + i for i in range(10)]  # 30–39, all above threshold; last gets highest score
    client = _mock_client(scores)
    result = rerank("bengaluru water", passages, bedrock_client=client)
    assert len(result) == 5


def test_returns_empty_when_all_scores_below_threshold():
    passages = [
        {"body": "unrelated text", "source_name": "src", "source_type": "news",
         "url": "http://x/1", "published_at": "2026-01-01", "indexed_at": "2026-01-01"}
        for _ in range(3)
    ]
    scores = [5, 10, 20]  # all below default threshold of 25
    client = _mock_client(scores)
    result = rerank("bmrcl metro purple line shutdown", passages, bedrock_client=client)
    assert result == []


def test_falls_back_to_es_order_on_exception(sample_passages):
    client = MagicMock()
    client.invoke_model.side_effect = Exception("Bedrock timeout")
    result = rerank("metro line", sample_passages, bedrock_client=client)
    assert result == sample_passages[:5]


def test_falls_back_on_invalid_json(sample_passages):
    body = json.dumps({"content": [{"type": "text", "text": "not valid json"}]})
    mock = MagicMock()
    mock.invoke_model.return_value = {"body": BytesIO(body.encode())}
    result = rerank("metro", sample_passages, bedrock_client=mock)
    assert result == sample_passages[:5]


def test_falls_back_on_score_count_mismatch(sample_passages):
    # 2 passages but only 1 score returned
    client = _mock_client([88])
    result = rerank("metro", sample_passages, bedrock_client=client)
    assert result == sample_passages[:5]


def test_empty_passages_returns_empty():
    client = _mock_client([])
    result = rerank("query", [], bedrock_client=client)
    assert result == []
