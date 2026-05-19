-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PersonType" NOT NULL,
    "status" "PersonStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_companyId_idx" ON "Person"("companyId");

-- CreateIndex
CREATE INDEX "Person_document_idx" ON "Person"("document");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
