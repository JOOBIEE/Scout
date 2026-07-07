-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "websiteSource" TEXT,
    "websiteConfidence" INTEGER,
    "rating" REAL,
    "reviewCount" INTEGER,
    "externalPlaceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SearchResult_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsiteAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "metaDescription" TEXT,
    "techStack" TEXT,
    "hasSsl" BOOLEAN,
    "isMobileFriendly" BOOLEAN,
    "loadTimeMs" INTEGER,
    "seoScore" INTEGER,
    "brandingScore" INTEGER,
    "trustScore" INTEGER,
    "mobileScore" INTEGER,
    "accessibilityScore" INTEGER,
    "overallScore" INTEGER,
    "rawFindings" TEXT,
    "auditedAt" DATETIME,
    CONSTRAINT "WebsiteAudit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opportunity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedByUser" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "OutreachMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrmStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_contacted',
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmStatus_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriorityScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasoning" TEXT,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriorityScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_externalPlaceId_key" ON "Business"("externalPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchResult_searchId_businessId_key" ON "SearchResult"("searchId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAudit_businessId_key" ON "WebsiteAudit"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmStatus_businessId_key" ON "CrmStatus"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PriorityScore_businessId_key" ON "PriorityScore"("businessId");
