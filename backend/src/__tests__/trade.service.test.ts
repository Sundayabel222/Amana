import { PrismaClient, TradeStatus } from "@prisma/client";
import { TradeAccessDeniedError, TradeService } from "../services/trade.service";

function createMockPrisma() {
  return {
    trade: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ total: null }]),
  } as unknown as PrismaClient;
}

describe("TradeService", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: TradeService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new TradeService(prisma);
  });

  describe("listUserTrades", () => {
    it("queries with scalar buyerAddress/sellerAddress fields", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", { page: 1, limit: 20 });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ buyerAddress: "ga_caller" }, { sellerAddress: "ga_caller" }],
          },
        })
      );
    });

    it("applies select to reduce fetched columns", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", { page: 1, limit: 20 });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            tradeId: true,
            buyerAddress: true,
            sellerAddress: true,
            amountUsdc: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      );
    });

    it("normalizes the address to lowercase", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_MIXED_CASE", { page: 1, limit: 20 });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ buyerAddress: "ga_mixed_case" }, { sellerAddress: "ga_mixed_case" }],
          },
        })
      );
    });

    it("filters by status", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", {
        status: TradeStatus.FUNDED,
        page: 1,
        limit: 20,
      });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TradeStatus.FUNDED }),
        })
      );
    });

    it("filters by createdAfter", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", {
        page: 1,
        limit: 20,
        createdAfter: "2024-01-01T00:00:00Z",
      });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
    });

    it("filters by createdBefore", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", {
        page: 1,
        limit: 20,
        createdBefore: "2025-06-01T00:00:00Z",
      });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        })
      );
    });

    it("returns only caller's trades", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([
        {
          id: 1,
          tradeId: "T1",
          buyerAddress: "ga_caller",
          sellerAddress: "ga_seller",
          amountUsdc: "100",
          status: TradeStatus.CREATED,
        },
      ]);
      prisma.trade.count = jest.fn().mockResolvedValue(1);

      const result = await service.listUserTrades("GA_CALLER", {
        page: 1,
        limit: 20,
        sort: "createdAt:desc",
      });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ buyerAddress: "ga_caller" }, { sellerAddress: "ga_caller" }],
          },
        })
      );
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("paginates correctly", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(55);

      const result = await service.listUserTrades("GA_CALLER", {
        page: 3,
        limit: 10,
      });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 55,
        totalPages: 6,
      });
    });

    it("clamps limit to max 100", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", { page: 1, limit: 999 });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("defaults sort to createdAt:desc", async () => {
      prisma.trade.findMany = jest.fn().mockResolvedValue([]);
      prisma.trade.count = jest.fn().mockResolvedValue(0);

      await service.listUserTrades("GA_CALLER", { page: 1, limit: 20 });

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } })
      );
    });
  });

  describe("getTradeById", () => {
    it("returns trade when caller is buyer", async () => {
      prisma.trade.findFirst = jest.fn().mockResolvedValue({
        id: 10,
        tradeId: "T10",
        buyerAddress: "ga_caller",
        sellerAddress: "ga_seller",
        amountUsdc: "900",
        status: TradeStatus.CREATED,
      });

      const trade = await service.getTradeById("10", "GA_CALLER");
      expect(trade).not.toBeNull();
      expect(trade?.tradeId).toBe("T10");
    });

    it("returns trade when caller is seller", async () => {
      prisma.trade.findFirst = jest.fn().mockResolvedValue({
        id: 10,
        tradeId: "T10",
        buyerAddress: "ga_buyer",
        sellerAddress: "ga_caller",
        amountUsdc: "900",
        status: TradeStatus.CREATED,
      });

      const trade = await service.getTradeById("10", "GA_CALLER");
      expect(trade).not.toBeNull();
      expect(trade?.tradeId).toBe("T10");
    });

    it("throws 403 if caller is not a party", async () => {
      prisma.trade.findFirst = jest.fn().mockResolvedValue({
        id: 10,
        tradeId: "T10",
        buyerAddress: "ga_a",
        sellerAddress: "ga_b",
        amountUsdc: "900",
        status: TradeStatus.CREATED,
      });

      await expect(service.getTradeById("10", "GA_NOT_PARTY")).rejects.toBeInstanceOf(
        TradeAccessDeniedError
      );
    });

    it("returns null when not found", async () => {
      prisma.trade.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getTradeById("999", "GA_CALLER");
      expect(result).toBeNull();
    });

    it("normalizes caller address before comparison", async () => {
      prisma.trade.findFirst = jest.fn().mockResolvedValue({
        id: 10,
        tradeId: "T10",
        buyerAddress: "ga_caller",
        sellerAddress: "ga_seller",
        amountUsdc: "900",
        status: TradeStatus.CREATED,
      });

      const trade = await service.getTradeById("10", "GA_CALLER");
      expect(trade).not.toBeNull();
    });
  });

  describe("getUserStats", () => {
    it("uses count and raw query for volume and open trades", async () => {
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(5);
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(3);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ total: "500" }]);

      const stats = await service.getUserStats("GA_CALLER");

      expect(stats.totalTrades).toBe(5);
      expect(stats.totalVolume).toBe(500);
      expect(stats.openTrades).toBe(3);
    });

    it("handles zero trades gracefully", async () => {
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ total: null }]);

      const stats = await service.getUserStats("GA_CALLER");
      expect(stats).toEqual({
        totalTrades: 0,
        totalVolume: 0,
        openTrades: 0,
      });
    });

    it("normalizes address to lowercase in queries", async () => {
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ total: null }]);

      await service.getUserStats("GA_UPPERCASE");

      expect(prisma.trade.count).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            OR: [{ buyerAddress: "ga_uppercase" }, { sellerAddress: "ga_uppercase" }],
          },
        })
      );
    });

    it('queries open trades count with "in" filter', async () => {
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.trade.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ total: null }]);

      await service.getUserStats("GA_CALLER");

      const openStatuses = [
        TradeStatus.CREATED,
        TradeStatus.FUNDED,
        TradeStatus.DELIVERED,
        TradeStatus.DISPUTED,
      ];
      expect(prisma.trade.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: openStatuses },
          }),
        })
      );
    });
  });
});
