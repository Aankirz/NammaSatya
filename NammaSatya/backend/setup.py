"""
Bootstrap script — idempotent.

Run once before starting the app:
    python setup.py

Creates:
  1. ELSER ingest pipeline  ('elser-ingest')
  2. Index with mapping      ('nammasatya-claims')
  3. Sets default_pipeline so crawler + RSS docs auto-embed via ELSER

Safe to re-run; existing resources are left unchanged.
"""

import json
import os
import sys

from dotenv import load_dotenv
from elasticsearch import Elasticsearch

load_dotenv()

ES_URL = os.environ["ES_URL"]
ES_API_KEY = os.environ["ES_API_KEY"]
ELSER_MODEL = os.environ.get("ELSER_MODEL_ID", ".elser_model_2_linux-x86_64")
INDEX = os.environ.get("ES_INDEX", "nammasatya-claims")
PIPELINE = "elser-ingest"


def get_client() -> Elasticsearch:
    return Elasticsearch(ES_URL, api_key=ES_API_KEY)


def check_elser(es: Elasticsearch) -> None:
    resp = es.ml.get_trained_models(model_id=ELSER_MODEL)
    models = resp.get("trained_model_configs", [])
    if not models:
        print(f"ERROR: ELSER model '{ELSER_MODEL}' not found.", file=sys.stderr)
        print("Deploy it via Kibana → ML → Trained Models, then re-run setup.py.", file=sys.stderr)
        sys.exit(1)
    state = models[0].get("model_id")
    print(f"ELSER model ready: {state}")


def create_pipeline(es: Elasticsearch) -> None:
    pipeline_body = {
        "description": "Run ELSER sparse embedding on body field",
        "processors": [
            {
                "inference": {
                    "model_id": ELSER_MODEL,
                    "input_output": [
                        {"input_field": "body", "output_field": "sparse_vector"}
                    ],
                    "on_failure": [
                        {
                            "append": {
                                "field": "_source._ingest.inference_errors",
                                "value": "{{_ingest.on_failure_message}}",
                            }
                        }
                    ],
                }
            }
        ],
    }
    es.ingest.put_pipeline(id=PIPELINE, body=pipeline_body)
    print(f"Ingest pipeline '{PIPELINE}' created/updated.")


def create_index(es: Elasticsearch) -> None:
    if es.indices.exists(index=INDEX):
        print(f"Index '{INDEX}' already exists — skipping creation.")
        return

    mappings = {
        "properties": {
            "title": {"type": "text"},
            "body": {"type": "text"},
            "url": {"type": "keyword"},
            "source_name": {"type": "keyword"},
            "source_type": {"type": "keyword"},
            "published_at": {"type": "date"},
            "indexed_at": {"type": "date"},
            "sparse_vector": {"type": "sparse_vector"},
        }
    }
    settings = {
        "default_pipeline": PIPELINE,
        "number_of_shards": 1,
        "number_of_replicas": 1,
    }
    es.indices.create(index=INDEX, mappings=mappings, settings=settings)
    print(f"Index '{INDEX}' created.")


def smoke_test(es: Elasticsearch) -> None:
    TEST_ID = "_setup_smoke_test"
    doc = {
        "title": "Setup smoke test",
        "body": "Bengaluru Metro Purple Line operational status test document.",
        "url": "https://nammasatya.internal/smoke-test",
        "source_name": "setup",
        "source_type": "official",
        "published_at": "2026-01-01T00:00:00Z",
        "indexed_at": "2026-01-01T00:00:00Z",
    }
    es.index(index=INDEX, id=TEST_ID, document=doc, refresh=True)
    result = es.get(index=INDEX, id=TEST_ID)
    if "_source" not in result:
        print("ERROR: smoke test document not found after indexing.", file=sys.stderr)
        sys.exit(1)
    es.delete(index=INDEX, id=TEST_ID, refresh=True)
    print("Verification passed — pipeline and index are wired correctly.")


def main() -> None:
    es = get_client()
    check_elser(es)
    create_pipeline(es)
    create_index(es)
    smoke_test(es)
    print("Setup complete.")


if __name__ == "__main__":
    main()
