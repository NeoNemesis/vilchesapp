-- CreateEnum
CREATE TYPE "ProjectMainCategory" AS ENUM ('VATRUM', 'KOK', 'TAK', 'MALNING', 'SNICKERI', 'EL', 'VVS', 'MURNING', 'KOMBINERAT');

-- CreateEnum
CREATE TYPE "ProjectComplexity" AS ENUM ('VERY_SIMPLE', 'SIMPLE', 'MEDIUM', 'COMPLEX', 'VERY_COMPLEX');

-- CreateEnum
CREATE TYPE "ProjectCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkCategoryType" AS ENUM ('RIVNING', 'VVS', 'EL', 'BYGG', 'KAKEL', 'MALNING', 'SNICKERI', 'MURNING', 'SPECIALARBETE', 'STADNING', 'FORBEREDELSE', 'FINISH');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('KAKEL_KLINKER', 'VVS_PORSLIN', 'VVS_DELAR', 'EL_ARMATURER', 'EL_MATERIAL', 'BYGG_MATERIAL', 'FARG_FINISH', 'GOLVVARME', 'KOK_LUCKOR', 'KOK_BENKSKIVA', 'VITVAROR', 'TRADGARD', 'VERKTYG', 'OVRIGT');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CITY_CENTER', 'SUBURB', 'COUNTRYSIDE');

-- CreateEnum
CREATE TYPE "AccessDifficulty" AS ENUM ('EASY', 'MEDIUM', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('LOCATION', 'FEATURE', 'CONDITION', 'MATERIAL', 'WORK_TYPE', 'CLIENT_TYPE', 'COMPLEXITY', 'SEASON');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE_REJECTED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "quoteId" TEXT;

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "mainCategory" "ProjectMainCategory" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "keywords" TEXT[],
    "searchText" TEXT,
    "areaSqm" DOUBLE PRECISION,
    "lengthMeters" DOUBLE PRECISION,
    "rooms" INTEGER,
    "heightMeters" DOUBLE PRECISION,
    "complexity" "ProjectComplexity" NOT NULL,
    "complexityReason" TEXT,
    "existingCondition" "ProjectCondition" NOT NULL,
    "hasGolvvarme" BOOLEAN NOT NULL DEFAULT false,
    "hasElUpdate" BOOLEAN NOT NULL DEFAULT false,
    "hasVvsUpdate" BOOLEAN NOT NULL DEFAULT false,
    "hasMovingWalls" BOOLEAN NOT NULL DEFAULT false,
    "hasSpecialTiles" BOOLEAN NOT NULL DEFAULT false,
    "hasStaircase" BOOLEAN NOT NULL DEFAULT false,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "specialFeaturesJson" JSONB,
    "location" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "accessDifficulty" "AccessDifficulty" NOT NULL,
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT true,
    "elevatorAvailable" BOOLEAN NOT NULL DEFAULT false,
    "estimatedTotalHours" DOUBLE PRECISION NOT NULL,
    "estimatedLaborCost" DOUBLE PRECISION NOT NULL,
    "estimatedMaterialCost" DOUBLE PRECISION NOT NULL,
    "estimatedTotalCost" DOUBLE PRECISION NOT NULL,
    "rotDeduction" DOUBLE PRECISION,
    "totalAfterRot" DOUBLE PRECISION,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "similarityScore" DOUBLE PRECISION,
    "confidenceLevel" DOUBLE PRECISION,
    "basedOnQuoteIds" TEXT[],
    "actualTotalHours" DOUBLE PRECISION,
    "actualLaborCost" DOUBLE PRECISION,
    "actualMaterialCost" DOUBLE PRECISION,
    "actualTotalCost" DOUBLE PRECISION,
    "actualLineItems" JSONB,
    "surprises" JSONB,
    "lessonsLearned" TEXT,
    "customerSatisfaction" INTEGER,
    "wouldPriceDifferently" TEXT,
    "variancePercent" DOUBLE PRECISION,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "category" "WorkCategoryType" NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION,
    "varianceHours" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteMaterial" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "materialId" TEXT,
    "customName" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "actualQuantity" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "keywords" TEXT[],
    "unit" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    "supplierArticleNumber" TEXT,
    "supplierUrl" TEXT,
    "typicalUsagePerSqm" DOUBLE PRECISION,
    "typicalUsageNote" TEXT,
    "priceHistory" JSONB,
    "premiumAlternativeId" TEXT,
    "budgetAlternativeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTag" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[],
    "mainCategory" "ProjectMainCategory" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "defaultComplexity" "ProjectComplexity" NOT NULL,
    "defaultAreaSqm" DOUBLE PRECISION,
    "workTemplate" JSONB NOT NULL,
    "materialTemplate" JSONB NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_quoteNumber_idx" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_clientEmail_idx" ON "Quote"("clientEmail");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_mainCategory_subCategory_idx" ON "Quote"("mainCategory", "subCategory");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE INDEX "Quote_keywords_idx" ON "Quote"("keywords");

-- CreateIndex
CREATE INDEX "Quote_areaSqm_complexity_idx" ON "Quote"("areaSqm", "complexity");

-- CreateIndex
CREATE INDEX "Quote_location_idx" ON "Quote"("location");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_category_idx" ON "QuoteLineItem"("category");

-- CreateIndex
CREATE INDEX "QuoteMaterial_quoteId_idx" ON "QuoteMaterial"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteMaterial_materialId_idx" ON "QuoteMaterial"("materialId");

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE INDEX "Material_keywords_idx" ON "Material"("keywords");

-- CreateIndex
CREATE INDEX "Material_name_idx" ON "Material"("name");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteTag_quoteId_tag_key" ON "QuoteTag"("quoteId", "tag");

-- CreateIndex
CREATE INDEX "QuoteTag_tag_idx" ON "QuoteTag"("tag");

-- CreateIndex
CREATE INDEX "QuoteTag_category_idx" ON "QuoteTag"("category");

-- CreateIndex
CREATE INDEX "QuoteTemplate_mainCategory_idx" ON "QuoteTemplate"("mainCategory");

-- CreateIndex
CREATE INDEX "QuoteTemplate_keywords_idx" ON "QuoteTemplate"("keywords");

-- CreateIndex
CREATE UNIQUE INDEX "Project_quoteId_key" ON "Project"("quoteId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteMaterial" ADD CONSTRAINT "QuoteMaterial_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteMaterial" ADD CONSTRAINT "QuoteMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTag" ADD CONSTRAINT "QuoteTag_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
