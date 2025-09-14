-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "shopifyDetected" BOOLEAN;

-- CreateTable
CREATE TABLE "RobotsCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RobotsCache_domain_key" ON "RobotsCache"("domain");
