"""
Bootstrap script — run once before starting the app, or on every deploy.
All operations are idempotent: safe to run multiple times.
"""

import os
import sys
from elasticsearch import Elasticsearch, BadRequestError
from dotenv import load_dotenv

load_dotenv()

INDEX_NAME = "blr-truth-check"
PIPELINE_ID = "elser-ingest"
ELSER_MODEL_ID = ".elser_model_2_linux-x86_64"


def get_client() -> Elasticsearch:
    url = os.environ["ES_URL"]
    api_key = os.environ["ES_API_KEY"]
    return Elasticsearch(url, api_key=api_key)


def wait_for_elser(es: Elasticsearch) -> None:
    """Block until ELSER model is deployed and ready."""
    print(f"Checking ELSER model '{ELSER_MODEL_ID}'...")
    try:
        models = es.ml.get_trained_models(model_id=ELSER_MODEL_ID)
        state = models["trained_model_configs"][0].get("fully_defined", False)
        if not state:
            print("ELSER model found but not fully deployed yet.")
            print("Go to Kibana → Machine Learning → Trained Models and wait for it to show 'Started'.")
            sys.exit(1)
        print("ELSER model ready.")
    except Exception as e:
        print(f"ELSER model not found: {e}")
        print("Deploy it via Kibana → Machine Learning → Trained Models → .elser_model_2 → Deploy")
        sys.exit(1)


def create_pipeline(es: Elasticsearch) -> None:
    """PUT is idempotent — creates or updates, never throws on re-run."""
    es.ingest.put_pipeline(
        id=PIPELINE_ID,
        description="Run ELSER on body field to generate sparse vectors",
        processors=[{
            "inference": {
                "model_id": ELSER_MODEL_ID,
                "input_output": [{
                    "input_field": "body",
                    "output_field": "sparse_vector"
                }]
            }
        }]
    )
    print(f"Ingest pipeline '{PIPELINE_ID}' created/updated.")


def create_index(es: Elasticsearch) -> None:
    """Create index only if it does not already exist."""
    if es.indices.exists(index=INDEX_NAME):
        print(f"Index '{INDEX_NAME}' already exists — skipping creation.")
        return

    es.indices.create(
        index=INDEX_NAME,
        mappings={
            "properties": {
                "title":         {"type": "text"},
                "body":          {"type": "text"},
                "url":           {"type": "keyword"},
                "source_name":   {"type": "keyword"},
                "source_type":   {"type": "keyword"},   # "official" | "news"
                "published_at":  {"type": "date"},
                "indexed_at":    {"type": "date"},
                "sparse_vector": {"type": "sparse_vector"}
            }
        },
        settings={
            "number_of_shards": 1,
            "number_of_replicas": 1,
            "default_pipeline": PIPELINE_ID   # every doc goes through ELSER automatically
        }
    )
    print(f"Index '{INDEX_NAME}' created.")


def verify(es: Elasticsearch) -> None:
    """Smoke-test: index a tiny doc through the pipeline and delete it."""
    test_doc = {
        "title": "setup-verify",
        "body": "BMRCL Purple Line maintenance test document",
        "url": "https://setup-verify",
        "source_name": "setup",
        "source_type": "official",
        "published_at": "2026-01-01T00:00:00",
        "indexed_at": "2026-01-01T00:00:00",
    }
    resp = es.index(index=INDEX_NAME, document=test_doc, refresh=True)
    doc_id = resp["_id"]
    es.delete(index=INDEX_NAME, id=doc_id)
    print("Verification passed — pipeline and index are wired correctly.")


def main() -> None:
    es = get_client()
    wait_for_elser(es)
    create_pipeline(es)
    create_index(es)
    verify(es)
    print("\nSetup complete. You can now run the ingestion and app.")


if __name__ == "__main__":
    main()
