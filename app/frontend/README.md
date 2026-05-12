# NammaSatya Frontend

Next.js 15 UI for checking Bengaluru civic claims and viewing operations stats.

## Responsibilities

- Claim-checking interface
- Verdict presentation with confidence, summary, citations, and freshness indicators
- Operations dashboard for claim counts, verdict distribution, source health, and indexed document trends
- API proxy routes to the FastAPI backend

## Key Files

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Main app shell |
| `src/components/CheckView.tsx` | Claim input and result flow |
| `src/components/VerdictCard.tsx` | Verdict display |
| `src/components/Citation.tsx` | Source citation display |
| `src/components/Dashboard/` | Operations dashboard widgets |
| `src/app/api/check/route.ts` | Proxy to backend `POST /check` |
| `src/app/api/stats/route.ts` | Proxy to backend `GET /index/stats` |

## Environment

Copy the example file if you need to override the backend URL:

```bash
cp .env.local.example .env.local
```

By default, the frontend proxies to:

```text
http://localhost:8000
```

Set `BACKEND_URL` in `.env.local` to change that.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```
