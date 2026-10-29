# One-click Deploy

## Fly.io
```bash
brew install flyctl
flyctl auth login
flyctl launch --copy-config # uses fly.toml

# create addons
flyctl redis create --name aether-redis
flyctl postgres create --name aether-pg --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

flyctl secrets set   DATABASE_URL=$(flyctl postgres connect --app aether-pg -C "echo $DATABASE_URL")   REDIS_URL=$(flyctl redis status --app aether-redis -j | jq -r .PrivateURL)   OPENAI_API_KEY=sk-proj-...   BRIDGE_INTERNAL_SECRET=$(openssl rand -hex 32)   JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."

flyctl deploy
flyctl open # http://aetherstate.fly.dev -> client demo at / + WS sync on :8081 auto-routed
```

## Render.com
1. Push this repo to GitHub
2. In Render dashboard: New -> Blueprint -> connect repo -> uses render.yaml
3. Set secrets in Render dashboard: OPENAI_API_KEY, JWT_PUBLIC_KEY
4. Deploy -> Render auto-creates aether-pg (pgvector enabled) + aether-redis + web service
5. Your demo will be at https://aetherstate-bridge-mcp.onrender.com

## Env required for both
- JWT_PUBLIC_KEY
- JWT_ISSUER, JWT_AUDIENCE (optional defaults set)
- BRIDGE_INTERNAL_SECRET (auto-generated on Render)
- OPENAI_API_KEY (optional - falls back to fake vectors)
- DATABASE_URL (auto from addon)
- REDIS_URL (auto from addon)
