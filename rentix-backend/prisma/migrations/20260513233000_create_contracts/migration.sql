-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED', 'FINISHED', 'DELETED');

-- CreateEnum
CREATE TYPE "ContractStatusReasonType" AS ENUM ('CANCELED', 'DELETED');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyName" TEXT,
    "tenantName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentValue" DECIMAL(10,2) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "statusReason" TEXT,
    "statusReasonType" "ContractStatusReasonType",
    "statusReasonAt" TIMESTAMP(3),
    "isTemporaryRental" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "renewedAt" TIMESTAMP(3),
    "renewalHistory" JSONB,
    "finishedAt" TIMESTAMP(3),
    "finishReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_companyId_idx" ON "Contract"("companyId");

-- CreateIndex
CREATE INDEX "Contract_propertyId_idx" ON "Contract"("propertyId");

-- CreateIndex
CREATE INDEX "Contract_tenantId_idx" ON "Contract"("tenantId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
