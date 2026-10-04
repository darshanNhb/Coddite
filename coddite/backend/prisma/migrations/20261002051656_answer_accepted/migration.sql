-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "acceptedCommentId" UUID,
ADD COLUMN     "isSolved" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_acceptedCommentId_fkey" FOREIGN KEY ("acceptedCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
