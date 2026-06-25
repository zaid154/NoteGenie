# Vector Search (Semantic Ask / Tutor) Setup

NoteGenie's **Ask** page and global tutor use semantic retrieval (Vector RAG): your
question is embedded with Gemini `text-embedding-004` and matched against embedded
chunks of your notes stored in the `documentchunks` collection.

**It is safe to deploy without this set up** — until the Atlas vector index exists,
retrieval automatically falls back to the existing keyword (full-text) search. RAG
turns on the moment the index + embeddings are present.

## 1. Create the Atlas Vector Search index

In MongoDB Atlas → your cluster → **Atlas Search** → **Create Search Index** →
**JSON Editor** → choose type **Vector Search**:

- **Database:** `notegenie`
- **Collection:** `documentchunks`
- **Index name:** `vector_index` (must match `RAG_VECTOR_INDEX`, default `vector_index`)

Index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

> `numDimensions` must be **768** (the size of `text-embedding-004` vectors).
> The `userId` filter field scopes results to the asking user. Vector Search is
> available on all tiers, including the free **M0**.

## 2. Backfill embeddings for existing materials

New uploads are embedded automatically. To embed materials created before RAG:

```bash
npm run embed:backfill --prefix server
```

## 3. Environment flags (optional)

| Key | Default | Purpose |
| --- | --- | --- |
| `RAG_ENABLED` | `true` | Set to `false` to disable embedding + vector search (pure lexical). |
| `RAG_VECTOR_INDEX` | `vector_index` | Atlas vector index name (must match step 1). |

## How it works

- On upload/regenerate/sample, notes are split into section-aware chunks and embedded into `documentchunks`.
- On an Ask/global-tutor question, the question is embedded and `$vectorSearch` returns the closest chunks (filtered to the user), which become the tutor's context with source citations.
- Any failure (missing index, embedding error) logs a warning and falls back to lexical search — never an error to the user.
