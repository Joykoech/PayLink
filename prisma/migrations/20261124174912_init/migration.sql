-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutRequestId" TEXT NOT NULL,
    "merchantRequestId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "accountReference" TEXT,
    "transactionDesc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultCode" INTEGER,
    "resultDesc" TEXT,
    "mpesaReceiptNumber" TEXT,
    "transactionDate" TEXT,
    "paymentLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_slug_key" ON "PaymentLink"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkoutRequestId_key" ON "Payment"("checkoutRequestId");
