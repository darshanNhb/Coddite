# ADR-0005: Raw Markdown Only, No Stored HTML

## Status

Accepted

## Context

Posts and comments contain user-authored markdown. The choice is between storing pre-rendered HTML alongside raw markdown, or storing only raw markdown and rendering/sanitizing at read time.

## Decision

Store **raw markdown only**. There is no `bodyHtml` column. Sanitize at render time so that a sanitizer fix also protects old content. Cache rendered output in Redis only if profiling shows a measurable need.

## Alternatives Considered

1. **Store both `bodyMarkdown` and `bodyHtml`** — Risk: if a sanitizer bug is found, all previously rendered HTML must be re-sanitized via a migration. Doubling storage for every post and comment.
2. **Store only HTML, discard markdown** — Cannot re-render with updated rules or a different renderer.

## Consequences

- Every read of a post or comment body runs the markdown → HTML → sanitize pipeline.
- If this becomes a performance bottleneck (measurable via profiling), rendered output is cached in Redis keyed by `(contentId, contentHash)`.
- Sanitizer upgrades automatically apply to all content without a data migration.
- The same rendering pipeline runs server-side (for API responses if needed) and client-side (for the SPA).
