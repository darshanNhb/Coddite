# Machine Learning Services (Phase 3)

This directory documents the AI/ML features integrated into Coddite during Phase 3.

## Overview
Coddite utilizes Machine Learning for three primary use-cases:
1. **Toxicity & Spam Detection**: Automatically classifying posts and comments using Google Perspective API. Content above the auto-hide threshold is removed, while content above the review threshold is flagged for human moderation.
2. **Similar Posts Detection**: Generating embeddings (using Google `text-embedding-004`) for all published posts, stored in PostgreSQL using `pgvector` with exactly 768 dimensions. Used to prevent duplicate questions.
3. **Auto-tagging**: Suggesting community tags using Gemini `gemini-1.5-flash` at post creation time.

## Evaluation
We run periodic evaluations of the toxicity classification model against a labeled dataset to ensure precision and recall remain high. 

Read the latest evaluation report here: [Latest Toxicity Evaluation](../../ml/reports/latest_eval.md)

## Architecture
The ML services use a Provider/Interface pattern in `@coddite/ml`.
- **Interfaces**: Strongly-typed JSDoc typedefs.
- **Providers**: Both real (Google APIs) and fake (for tests) implementations.
- **Policy**: `moderationPolicy.js` converts raw scores into actionable decisions (`ALLOW`, `REVIEW`, `HIDE`).
