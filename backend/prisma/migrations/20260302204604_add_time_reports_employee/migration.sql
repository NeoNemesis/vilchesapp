-- CreateEnum
CREATE TYPE "TimeReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'EMPLOYEE';

-- CreateTable
CREATE TABLE "TimeReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" "TimeReportStatus" NOT NULL DEFAULT 'DRAFT',
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeReportEntry" (
    "id" TEXT NOT NULL,
    "timeReportId" TEXT NOT NULL,
    "projectId" TEXT,
    "activityName" TEXT NOT NULL,
    "comment" TEXT,
    "mondayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tuesdayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wednesdayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thursdayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fridayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saturdayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sundayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimeReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountantSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeReport_userId_idx" ON "TimeReport"("userId");

-- CreateIndex
CREATE INDEX "TimeReport_status_idx" ON "TimeReport"("status");

-- CreateIndex
CREATE INDEX "TimeReport_year_weekNumber_idx" ON "TimeReport"("year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TimeReport_userId_weekNumber_year_key" ON "TimeReport"("userId", "weekNumber", "year");

-- CreateIndex
CREATE INDEX "TimeReportEntry_timeReportId_idx" ON "TimeReportEntry"("timeReportId");

-- AddForeignKey
ALTER TABLE "TimeReport" ADD CONSTRAINT "TimeReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeReport" ADD CONSTRAINT "TimeReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeReportEntry" ADD CONSTRAINT "TimeReportEntry_timeReportId_fkey" FOREIGN KEY ("timeReportId") REFERENCES "TimeReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeReportEntry" ADD CONSTRAINT "TimeReportEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
