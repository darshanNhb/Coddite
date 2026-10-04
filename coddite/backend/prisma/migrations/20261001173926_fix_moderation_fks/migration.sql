/*
  Warnings:

  - You are about to drop the column `targetId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `reports` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "reports_targetType_targetId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "targetId",
ADD COLUMN     "commentId" UUID,
ADD COLUMN     "postId" UUID,
ADD COLUMN     "reportId" UUID,
ADD COLUMN     "targetProfileId" UUID;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "targetId",
ADD COLUMN     "commentId" UUID,
ADD COLUMN     "postId" UUID;

-- CreateIndex
CREATE INDEX "reports_postId_idx" ON "reports"("postId");

-- CreateIndex
CREATE INDEX "reports_commentId_idx" ON "reports"("commentId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CHECK constraints for polymorphism
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_check" CHECK (
  ("postId" IS NOT NULL AND "commentId" IS NULL) OR
  ("postId" IS NULL AND "commentId" IS NOT NULL)
);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_check" CHECK (
  (CASE WHEN "postId" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "commentId" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "reportId" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "targetProfileId" IS NOT NULL THEN 1 ELSE 0 END) <= 1
);
