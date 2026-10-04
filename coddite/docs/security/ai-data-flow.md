# AI Data Flow Security 

## Scope
This document outlines the data exchanged between the Coddite platform and 3rd-party Hosted AI APIs (Google Perspective API and Google Gemini).

## Shared Data Guarantees
**At no point in the AI lifecycle do we transmit:**
- User Handles (these are stripped out before processing)
- User Email Addresses, Hashes, or Ciphertexts
- IP Addresses or Location Data
- JWTs or Authentication Tokens
- Any database auto-generated UUIDs linking to a specific user

## Data Flow Specifications

### 1. Toxicity Scoring (Perspective API)
**Trigger**: Post Creation & Comment Creation
**Data Sent**:
- Post Title + Body Markdown
- Comment Body Markdown
**Reasoning**: Used to classify the raw text into a 0.0-1.0 toxicity probability. The identity of the author is fully disconnected from this REST request.

### 2. Embeddings Generation (Google Gemini `text-embedding-004`)
**Trigger**: Post Creation
**Data Sent**: 
- Post Title + Body Markdown
**Reasoning**: Embeddings are generated purely on the content to find mathematically similar vectors representing identical semantic concepts.

### 3. Tag Suggestion (Google Gemini `gemini-1.5-flash`)
**Trigger**: Dedicated Endpoint (`POST /posts/tags/suggest`)
**Data Sent**:
- Raw text input from the client (drafted post body).
**Reasoning**: The language model only receives the exact contextual prompt asking for 5 extracted tags based entirely on the text snippet itself. No account metadata is provided.
