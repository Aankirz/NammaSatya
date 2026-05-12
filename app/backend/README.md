# NammaSatya Backend

FastAPI backend for the NammaSatya fact-checking pipeline.

## Responsibilities

- Exposes `POST /check` for claim verification
- Exposes `GET /health` for liveness checks
- Exposes `GET /index/stats` for the frontend operations dashboard
- Bootstraps Elasticsearch index and ELSER ingest pipeline
- Polls RSS sources for local Bengaluru civic/news evidence
- Runs the Bedrock + Elasticsearch agent pipeline

## Key Files

| File | Purpose |
| --- | --- |
| `api.py` | FastAPI application and API schemas |
| `agent.py` | Claim sanitization, search, reranking, verdict generation |
| `setup.py` | Idempotent Elasticsearch pipeline/index setup |
| `rss_poller.py` | 5-minute RSS ingestion loop |
| `crawler/config.yml` | Elastic Open Crawler target paths |
| `tests/` | Unit tests for sanitizer, reranker, and agent behavior |

## Environment

Copy the example env file and fill in real credentials:

```bash
cp .env.example .env
```

Required values:

| Variable | Purpose |
| --- | --- |
| `ES_URL` | Elasticsearch endpoint |
| `ES_API_KEY` | Elasticsearch API key |
| `ES_INDEX` | Index name, defaults to `nammasatya-claims` |
| `ELSER_MODEL_ID` | Deployed ELSER model ID |
| `AWS_REGION` | AWS Bedrock region |
| `BEDROCK_MODEL_ID` | Claude Sonnet model for verdict generation |
| `RERANKER_MODEL_ID` | Claude Haiku model for query extraction/reranking |

## Install

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Bootstrap Elasticsearch

Run once per environment after ELSER is deployed:

```bash
python setup.py
```

This creates or updates:

- `elser-ingest` ingest pipeline
- `nammasatya-claims` index, unless `ES_INDEX` overrides it
- default ingest pipeline wiring

## Run API

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://localhost:8000/health
```

Check a claim:

```bash
curl -X POST http://localhost:8000/check \
  -H 'Content-Type: application/json' \
  -d '{"claim":"BMRCL is shutting down the entire Purple Line on Tuesday"}'
```

## Run RSS Poller

```bash
python rss_poller.py
```

The poller runs continuously and indexes The Hindu Bengaluru, The Hindu Karnataka, and Citizen Matters.

## Test

```bash
pytest
```
