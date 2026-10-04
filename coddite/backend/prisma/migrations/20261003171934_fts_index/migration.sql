-- AlterTable
ALTER TABLE "posts" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce("bodyMarkdown", '')), 'B')
) STORED;

-- CreateIndex
CREATE INDEX "posts_searchVector_idx" ON "posts" USING GIN ("searchVector");
