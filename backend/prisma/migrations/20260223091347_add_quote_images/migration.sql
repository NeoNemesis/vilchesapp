-- CreateTable
CREATE TABLE "QuoteImage" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuoteImage" ADD CONSTRAINT "QuoteImage_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
