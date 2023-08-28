-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "isPaid" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
