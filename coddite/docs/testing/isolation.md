# Test Isolation

When writing and running tests in Coddite, we utilize Vitest's default file parallelism to ensure the test suite runs as fast as possible. This means multiple test files (`.test.js`) will execute simultaneously against the same shared PostgreSQL database.

## The Problem
Because tests share a database, global teardowns like `await prisma.user.deleteMany()` inside a test file's `afterEach` or `afterAll` hook will indiscriminately wipe out rows that other test files are currently relying on, causing sporadic foreign key constraint violations and 401/404 flakes.

## Our Approach: Additive Unique Data
To guarantee isolation without the overhead of per-file database schemas or complex transaction rollback mechanics, we use the **Additive Unique Data** approach:

1. **No Destructive Hooks**: Never use `deleteMany()` or `delete()` across tables in `afterEach` or `afterAll`. Let the test data accumulate in the database during the run. The database is ephemeral and wiped entirely on fresh setups anyway.
2. **Unique Identifiers**: Always use `uuidv7()` to generate primary keys, and dynamically interpolate `uuidv7().slice(-8)` or `Date.now()` into unique constraints like `emailHash`, `handle`, and `slug`.
    - **Example**: `handle: \`testuser-${uuidv7().slice(-8)}\``
3. **Scoped Queries**: When asserting list lengths (e.g. `GET /api/v1/posts`), always filter by a specific parent ID (e.g. `communityId`) that was uniquely generated within that test, rather than assuming the database only contains your test's rows.

By appending a random slice of a UUID to unique fields, concurrent tests will never collide on unique constraints, and by avoiding destructive queries, concurrent tests will never delete each other's data mid-run. This allows Vitest to run the full suite in under 5 seconds.
