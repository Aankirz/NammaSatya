# BLR Truth Check — One Pager

## The Problem
Every day, Bengaluru residents forward civic claims on WhatsApp that are false, mangled, or invented. "BMRCL is shutting the Purple Line." "BBMP banned plastic cups." "Water cut extended 3 days." By the time the claim reaches you, the original fact has been distorted through a dozen forwards. There is no fast, trusted way to check.

## What We Built
A fact-checking agent for Bengaluru civic claims. Paste any viral message. Get a verdict in seconds, backed by citations from official sources.

## How It Works
```
Viral claim → Sanitizer → Elasticsearch Hybrid Search → LLM Reranker → Claude → Verdict + Citations
```

1. The claim is sanitised (prompt injection defence) and converted into a search query
2. Elasticsearch searches across indexed official gov sites and verified news feeds using both keyword and semantic (ELSER) matching
3. A Claude Haiku call scores all 20 passages for relevance (0–100) and selects the top 5
4. Claude on AWS Bedrock reads those 5 passages and returns a structured verdict

## The Verdict
Four states — more useful than binary true/false:

| Verdict | Meaning |
|---------|---------|
| SUPPORTED | Claim matches what sources say |
| REFUTED | Sources directly contradict the claim |
| UNVERIFIED | No indexed source covers this claim |
| **MANGLED** | True core, distorted in transmission |

Every verdict includes citations with source name, direct URL, excerpt, and date.

## Data Sources
| Type | Sources | Frequency |
|------|---------|-----------|
| Official (crawled) | BMRCL, BBMP, BWSSB, Karnataka.gov, PIB BLR | Every 3h |
| News (RSS) | The Hindu BLR, The Hindu Karnataka, Citizen Matters | Every 5 min |

## Tech Stack
- **Elastic Open Crawler** — targeted crawl of official gov press release paths
- **Elasticsearch + ELSER** — hybrid BM25 + semantic search
- **LLM Reranker** — Claude Haiku scores passages 0–100, top-20 → top-5, no external API
- **Elastic Agent Builder + MCP** — orchestration and tool calls
- **AWS Bedrock (Claude Sonnet)** — verdict generation via structured tool use
- **Kibana** — live dashboard: trending claims, verdict distribution, source hits

## What Makes This Hard
Generic chatbots hallucinate Bengaluru facts. This agent never generates facts — it only summarises what indexed sources say. The harder problem is prompt injection: the misinformation being checked can itself contain `"ignore previous instructions"`. Three-layer defence: input sanitisation, structural DATA wrapping, and system prompt bookending.

## Live Demo
Claim: *"BMRCL is shutting down the entire Purple Line on Tuesday"*
Verdict: **MANGLED** (0.87 confidence)
> The Hindu, May 8 2026: "Bengaluru Metro to suspend Purple Line services for **two hours** on May 10 — between Hosahalli and Cubbon Park, 7am–9am, for maintenance."

The claim is partially true. The distortion: "entire line" and "shut down" vs "2 hours, specific stations."
