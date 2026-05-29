-- CreateIndex
-- Composite indexes for the common trade listing query pattern:
-- WHERE (buyerAddress = ? OR sellerAddress = ?) AND status = ? ORDER BY createdAt DESC
CREATE INDEX "Trade_buyerAddress_status_createdAt_idx" ON "Trade"("buyerAddress", "status", "createdAt");
CREATE INDEX "Trade_sellerAddress_status_createdAt_idx" ON "Trade"("sellerAddress", "status", "createdAt");
