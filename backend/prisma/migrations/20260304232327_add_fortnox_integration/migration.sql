-- CreateEnum
CREATE TYPE "FortnoxSalaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fortnoxEmployeeId" TEXT,
ADD COLUMN     "fortnoxSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL,
    "orgNumber" TEXT,
    "logo" TEXT,
    "industry" TEXT NOT NULL DEFAULT 'general',
    "enableQuotes" BOOLEAN NOT NULL DEFAULT true,
    "enableTimeReports" BOOLEAN NOT NULL DEFAULT true,
    "enableRotDeduction" BOOLEAN NOT NULL DEFAULT false,
    "enableRutDeduction" BOOLEAN NOT NULL DEFAULT false,
    "enableMapView" BOOLEAN NOT NULL DEFAULT false,
    "enableSms" BOOLEAN NOT NULL DEFAULT false,
    "enableEmailMonitor" BOOLEAN NOT NULL DEFAULT false,
    "enableTelegram" BOOLEAN NOT NULL DEFAULT false,
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "enableAutomations" BOOLEAN NOT NULL DEFAULT false,
    "enableFortnox" BOOLEAN NOT NULL DEFAULT false,
    "customPricing" JSONB,
    "customCategories" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'SEK',
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "primaryColor" TEXT NOT NULL DEFAULT '#2C7A4B',
    "accentColor" TEXT NOT NULL DEFAULT '#F97316',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromName" TEXT,
    "smtpFromEmail" TEXT,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "setupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FortnoxSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clientId" TEXT,
    "clientSecret" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FortnoxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FortnoxSalaryLog" (
    "id" TEXT NOT NULL,
    "timeReportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "FortnoxSalaryStatus" NOT NULL DEFAULT 'PENDING',
    "totalHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "grossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vacationPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employerFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FortnoxSalaryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FortnoxSalaryLog_timeReportId_idx" ON "FortnoxSalaryLog"("timeReportId");

-- CreateIndex
CREATE INDEX "FortnoxSalaryLog_userId_idx" ON "FortnoxSalaryLog"("userId");

-- CreateIndex
CREATE INDEX "FortnoxSalaryLog_status_idx" ON "FortnoxSalaryLog"("status");

-- AddForeignKey
ALTER TABLE "FortnoxSalaryLog" ADD CONSTRAINT "FortnoxSalaryLog_timeReportId_fkey" FOREIGN KEY ("timeReportId") REFERENCES "TimeReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FortnoxSalaryLog" ADD CONSTRAINT "FortnoxSalaryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
