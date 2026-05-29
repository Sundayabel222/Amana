import { Prisma, PrismaClient, TradeStatus } from "@prisma/client";

export type TradeListFilters = {
  status?: TradeStatus;
  page?: number;
  limit?: number;
  sort?: string;
  createdAfter?: string;
  createdBefore?: string;
};

export class TradeAccessDeniedError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "TradeAccessDeniedError";
  }
}

const TRADE_LIST_SELECT = {
  id: true,
  tradeId: true,
  buyerAddress: true,
  sellerAddress: true,
  amountUsdc: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export class TradeService {
  constructor(private readonly prisma: PrismaClient) {}

  async listUserTrades(address: string, filters: TradeListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;
    const orderBy = this.parseSort(filters.sort);

    const normalizedAddress = address.toLowerCase();

    const where: Prisma.TradeWhereInput = {
      OR: [{ buyerAddress: normalizedAddress }, { sellerAddress: normalizedAddress }],
      ...(filters.status ? { status: filters.status } : {}),
    };

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = new Date(filters.createdAfter);
      }
      if (filters.createdBefore) {
        where.createdAt.lte = new Date(filters.createdBefore);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.trade.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: TRADE_LIST_SELECT,
      }),
      this.prisma.trade.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getTradeById(id: string, callerAddress: string) {
    const normalizedAddress = callerAddress.toLowerCase();
    const numericId = Number(id);
    const orConditions: Prisma.TradeWhereInput[] = [{ tradeId: id }];

    if (Number.isInteger(numericId) && numericId > 0) {
      orConditions.push({ id: numericId });
    }

    const trade = await this.prisma.trade.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!trade) {
      return null;
    }

    if (trade.buyerAddress !== normalizedAddress && trade.sellerAddress !== normalizedAddress) {
      throw new TradeAccessDeniedError();
    }

    return trade;
  }

  async getUserStats(address: string) {
    const normalizedAddress = address.toLowerCase();

    const openStatuses = [TradeStatus.CREATED, TradeStatus.FUNDED, TradeStatus.DELIVERED, TradeStatus.DISPUTED];

    const [countResult, openCount, volumeResult] = await Promise.all([
      this.prisma.trade.count({
        where: {
          OR: [{ buyerAddress: normalizedAddress }, { sellerAddress: normalizedAddress }],
        },
      }),
      this.prisma.trade.count({
        where: {
          OR: [{ buyerAddress: normalizedAddress }, { sellerAddress: normalizedAddress }],
          status: { in: openStatuses },
        },
      }),
      this.prisma.$queryRaw<{ total: string | null }[]>`
        SELECT SUM(CAST("amountUsdc" AS DECIMAL)) as total
        FROM "Trade"
        WHERE ("buyerAddress" = ${normalizedAddress} OR "sellerAddress" = ${normalizedAddress})
      `,
    ]);

    const totalVolume = Number(volumeResult[0]?.total ?? 0);

    return {
      totalTrades: countResult,
      totalVolume: Number.isFinite(totalVolume) ? totalVolume : 0,
      openTrades: openCount,
    };
  }

  private parseSort(sort?: string): Prisma.TradeOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: "desc" };
    }

    const [fieldRaw, dirRaw] = sort.split(":");
    const direction = dirRaw?.toLowerCase() === "asc" ? "asc" : "desc";

    const allowedFields = new Set<string>([
      "id",
      "tradeId",
      "buyerAddress",
      "sellerAddress",
      "amountUsdc",
      "status",
      "createdAt",
      "updatedAt",
    ]);

    if (!allowedFields.has(fieldRaw)) {
      return { createdAt: "desc" };
    }

    return { [fieldRaw]: direction };
  }
}
