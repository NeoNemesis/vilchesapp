/*
  Warnings:

  - You are about to drop the `EmailTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'LOGIN_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'UNAUTHORIZED_ACCESS';
ALTER TYPE "NotificationType" ADD VALUE 'SUSPICIOUS_ACTIVITY';
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'EMAIL_CHANGE_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'EMAIL_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_CHANGE_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RESET_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RESET_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'WELCOME_EMAIL_SENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectMainCategory" ADD VALUE 'MALNING_TAPETSERING';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'SNICKERIARBETEN';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'TOTALRENOVERING';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'MOBELMONTERING';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'FASADMALNING';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'ALTAN_TRADACK';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'GARDEROB';
ALTER TYPE "ProjectMainCategory" ADD VALUE 'TAPETSERING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkCategoryType" ADD VALUE 'SKRAPNING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'RENGORING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'TAPETSERING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'FASADMALNING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'GOLVVARME';
ALTER TYPE "WorkCategoryType" ADD VALUE 'BYGGNATION';
ALTER TYPE "WorkCategoryType" ADD VALUE 'MONTERING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'PLATSBYGGDA_MOBEL';
ALTER TYPE "WorkCategoryType" ADD VALUE 'KOKSMONTAGE';
ALTER TYPE "WorkCategoryType" ADD VALUE 'BILERSATTNING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'SOPHANTERING';
ALTER TYPE "WorkCategoryType" ADD VALUE 'OVRIGT';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "applyRotDeduction" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "floorCount" INTEGER,
ADD COLUMN     "includeVat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materialType" TEXT,
ADD COLUMN     "omfattning" TEXT,
ADD COLUMN     "totalWithVat" DOUBLE PRECISION,
ADD COLUMN     "vatAmount" DOUBLE PRECISION,
ADD COLUMN     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "customCategory" TEXT,
ADD COLUMN     "quantity" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "unitPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "QuoteTemplate" ADD COLUMN     "includeVat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "EmailTemplate";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
