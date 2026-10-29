import express from 'express';
import { z } from 'zod';
import * as Automerge from '@automerge/automerge';
import { broadcastToMesh } from './mesh.js';
import { indexOperation, saveDocBinary, loadDocBinary } from './persister.js';
import { startSyncServer } from './syncServer.js';
import crypto from 'crypto';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static('client')); // serve index.html

const SYNC_WS_PORT = parseInt(process.env.SYNC_WS_PORT || '8081');
startSyncServer(SYNC_WS_PORT);

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type DocRecord = { doc: Automerge.Doc<any>, updatedAt: number };
const memCache = new Map<string, DocRecord>();

const Schema = z.object({
  docId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  key: z.string().min(1).max(128).regex(/^[a-zA-Z0-9/_-]+$/),
  value: z.string().max(32*1024),
  actorId: z.string().min(1).max(128),
  bridgeSecret: z.string(),
});

async function getDoc(docId: string): Promise<Automerge.Doc<any>> {
  if (memCache.has(docId)) return memCache.get(docId)!.doc;
  const binary = await loadDocBinary(docId);
  let doc = binary && binary.length>0 ? Automerge.load(binary) : Automerge.init<any>();
  memCache.set(docId, { doc, updatedAt: Date.now() });
  return doc;
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (openai) {
    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    return resp.data[0].embedding;
  } else {
    // fallback deterministic fake for dev without key
    const hash = crypto.createHash('sha256').update(text).digest();
    return Array.from({length:1536}, (_,i)=> (hash[i%32]/255)*2-1 );
  }
}

app.post('/mutate', async (req,res)=>{
  const p = Schema.safeParse(req.body);
  if(!p.success) return res.status(400).json({ error: p.error.flatten() });
  if(p.data.bridgeSecret !== process.env.BRIDGE_INTERNAL_SECRET) return res.status(401).end();
  const { docId, key, value, actorId } = p.data;
  try {
    let doc = await getDoc(docId);
    const nextDoc = Automerge.change(doc, { actor: actorId as any }, (d:any)=>{
      const parts = key.split('/');
      let cur = d;
      for(let i=0;i<parts.length-1;i++){ if(!cur[parts[i]]) cur[parts[i]] = {}; cur = cur[parts[i]]; }
      cur[parts[parts.length-1]] = value;
    });
    const binary = Automerge.save(nextDoc);
    memCache.set(docId, { doc: nextDoc, updatedAt: Date.now() });
    saveDocBinary(docId, binary).catch(console.error);
    const changes = Automerge.getChanges(doc, nextDoc);
    for (const c of changes) await broadcastToMesh(docId, c);
    (async()=>{
      try{
        const sanitized = value.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g,'[email]').slice(0,2000);
        if(sanitized.length < 10) return;
        const emb = await generateEmbedding(sanitized);
        const opHash = crypto.createHash('sha256').update(changes[0]||Buffer.from(key+value)).digest('hex').slice(0,16);
        await indexOperation(docId, opHash, actorId, key, sanitized, emb);
        console.log(`[embedding] indexed ${docId}/${key} ${emb.length}d ${openai ? 'openai' : 'fake'}`);
      }catch(e){ console.error('index failed',e); }
    })();
    res.json({ ok:true, actorId });
  } catch(e){ console.error(e); res.status(500).json({ error: 'mutation failed' }); }
});

app.get('/doc/:docId', async (req,res)=>{
  const doc = await getDoc(req.params.docId);
  res.json(doc);
});

app.get('/doc/:docId/search', async (req,res)=>{
  const q = req.query.q as string;
  if(!q) return res.status(400).json({ error: 'q required' });
  const emb = await generateEmbedding(q);
  const { semanticSearch } = await import('./persister.js');
  const results = await semanticSearch(req.params.docId, emb, 5);
  res.json(results);
});

app.listen(parseInt(process.env.PORT_BRIDGE||'8080'), ()=>console.log(`Bridge HTTP :${process.env.PORT_BRIDGE||'8080'} + Sync WS :${SYNC_WS_PORT} + Client http://localhost:${process.env.PORT_BRIDGE||'8080'}/`));
