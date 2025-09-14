-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "instagramUsername" TEXT,
    "instagramLastPostAt" DATETIME,
    "instagramActive30d" BOOLEAN NOT NULL DEFAULT false,
    "instagramSource" TEXT,
    "instagramError" TEXT,
    "googleBrandQuery" TEXT
);

-- CreateTable
CREATE TABLE "ProductSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "ratingValue" REAL,
    "reviewCount" INTEGER,
    "widget" TEXT,
    "source" TEXT NOT NULL,
    "rawEvidence" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductSample_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandAggregate" (
    "brandId" TEXT NOT NULL PRIMARY KEY,
    "productCount" INTEGER NOT NULL,
    "sumReviewCount" INTEGER NOT NULL,
    "weightedAvgRating" REAL,
    "simpleAvgRating" REAL,
    "medianRating" REAL,
    "minRating" REAL,
    "maxRating" REAL,
    "sampleCoverage" REAL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandAggregate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "returnPolicyUrl" TEXT,
    "returnWindowDays" INTEGER,
    "shippingPolicyUrl" TEXT,
    "shippingFree" BOOLEAN,
    "shippingAlwaysFree" BOOLEAN,
    "shippingFreeThreshold" REAL,
    "shippingCurrency" TEXT,
    "notes" TEXT,
    "evidence" TEXT,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicySnapshot_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReputationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "rating" REAL,
    "reviewsCount" INTEGER,
    "sourceUrl" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReputationSnapshot_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "verifiedSyntax" BOOLEAN NOT NULL DEFAULT false,
    "verifiedMx" BOOLEAN NOT NULL DEFAULT false,
    "verifiedService" TEXT,
    "verificationStatus" TEXT,
    "verificationScore" REAL,
    "verifiedAt" DATETIME,
    "evidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactEmail_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSample_url_key" ON "ProductSample"("url");

-- CreateIndex
CREATE INDEX "ProductSample_brandId_idx" ON "ProductSample"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicySnapshot_brandId_key" ON "PolicySnapshot"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationSnapshot_brandId_key" ON "ReputationSnapshot"("brandId");

-- CreateIndex
CREATE INDEX "ContactEmail_brandId_idx" ON "ContactEmail"("brandId");
