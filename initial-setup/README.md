# Initial Setup

This folder preserves the first Elasticsearch bootstrap script from the hackathon.

It is useful as a small historical reference for how the original `blr-truth-check`
index and `elser-ingest` pipeline were created.

## Files

- `setup.py` — creates the original Elasticsearch index, ELSER ingest pipeline, and smoke-test document.
- `requirements.txt` — minimal dependencies needed to run `setup.py`.

## Active Implementation

The current app setup now lives in:

- `app/backend/`
- `app/frontend/`

New backend work should happen in `app/backend/`.
