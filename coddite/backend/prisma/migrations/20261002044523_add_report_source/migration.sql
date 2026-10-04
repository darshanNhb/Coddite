-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('USER', 'AI_MODERATION');

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporterId_fkey";

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "source" "ReportSource" NOT NULL DEFAULT 'USER',
ALTER COLUMN "reporterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing AI reports
UPDATE "reports"
SET "source" = 'AI_MODERATION', "reporterId" = NULL
WHERE "reason" = 'AUTO_MODERATION';
