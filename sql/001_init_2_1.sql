CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS documents (doc_id TEXT PRIMARY KEY, automerge_binary BYTEA NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS doc_ops (id BIGSERIAL PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE, op_hash TEXT NOT NULL, actor_id TEXT NOT NULL, key_path TEXT NOT NULL, snippet TEXT NOT NULL, embedding vector(1536), created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(doc_id, op_hash));
CREATE INDEX IF NOT EXISTS idx_ops_doc_id ON doc_ops(doc_id);
