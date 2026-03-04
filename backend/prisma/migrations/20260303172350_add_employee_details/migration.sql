-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "employmentStartDate" TIMESTAMP(3),
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "personalNumber" TEXT,
ADD COLUMN     "vacationPayPercent" DOUBLE PRECISION;
