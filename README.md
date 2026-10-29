
# AetherState - Automerge + pgvector + WS Sync

[![Fly Deploy](https://github.com/yourusername/aetherstate/actions/workflows/fly.yml/badge.svg)](https://github.com/yourusername/aetherstate/actions/workflows/fly.yml)

Real-time CRDT platform for human + AI collaboration.

## Quick Start
```bash
cp .env.example .env
npm install
docker-compose up --build
open http://localhost:8080/ # live 2-peer demo
```

## Architecture
```
Browser (Automerge WASM) <-> WS Sync :8081 (per-peer syncState) <-> Bridge :8080 (Postgres binary + pgvector) <-> Redis fanout <-> MCP :3000 (JWT + pooled WS)
```

## Deploy

### Fly.io (recommended)
```bash
flyctl launch
flyctl redis create
flyctl postgres create
flyctl secrets set OPENAI_API_KEY=... JWT_PUBLIC_KEY="..."
flyctl deploy
```

### Render
Push to GitHub -> Render New Blueprint (uses render.yaml) -> set secrets -> deploy

See DEPLOY.md for details.

## Live Demo
client/index.html shows Peer A + Peer B syncing same docId live + semantic search.

## Env
- OPENAI_API_KEY (optional, falls back to fake vectors)
- JWT_PUBLIC_KEY, JWT_ISSUER, JWT_AUDIENCE
- BRIDGE_INTERNAL_SECRET
- DATABASE_URL, REDIS_URL
```
