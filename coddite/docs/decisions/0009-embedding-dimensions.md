# ADR 9: Embedding Dimensions Lock

## Status
Accepted

## Context
In Phase 3 (AI/ML Integration), we will generate embeddings for Posts to find "Similar Posts" using vector cosine similarity. The `pgvector` Postgres extension requires that the dimension of the embedding vector be specified in the schema at table creation time (e.g. `vector(768)`).

## Decision
We will lock the embedding column in the `Post` table to **768 dimensions** (`Unsupported("vector(768)")?` in Prisma).

This matches standard embedding models such as:
- Google `text-embedding-004` (Default)
- Nomic Embed Text (`nomic-embed-text`)
- Various standard HuggingFace models

If a different embedding model is chosen later (e.g. `text-embedding-3-small` from OpenAI, which is 1536), we will need to perform a database migration to alter the column dimension and re-calculate all existing embeddings.

## Consequences
- **Positive:** We have a clear target dimension for our embedding integrations.
- **Negative:** Hard-coupling the dimension at the database layer means switching to a vastly different model (e.g., OpenAI's 1536) requires a schema migration and data backfill.
