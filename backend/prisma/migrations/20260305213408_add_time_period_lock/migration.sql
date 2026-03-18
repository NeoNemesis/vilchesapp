-- CreateTable
CREATE TABLE "TimePeriodLock" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "TimePeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimePeriodLock_year_month_idx" ON "TimePeriodLock"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "TimePeriodLock_year_month_key" ON "TimePeriodLock"("year", "month");

-- AddForeignKey
ALTER TABLE "TimePeriodLock" ADD CONSTRAINT "TimePeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
