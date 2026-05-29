import { PrismaClient } from '@prisma/client';

const ADDRESS_FIELDS: Record<string, string[]> = {
  User: ['walletAddress'],
  Trade: ['buyerAddress', 'sellerAddress'],
  Dispute: ['initiator'],
};

function lowercaseWhere(obj: unknown): void {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === 'string') {
      (obj as Record<string, unknown>)[key] = val.toLowerCase();
    } else if (Array.isArray(val)) {
      for (const item of val) {
        lowercaseWhere(item);
      }
    } else if (val && typeof val === 'object') {
      lowercaseWhere(val);
    }
  }
}

function normalizeAddressFields(params: { model?: string; args: { data?: unknown; where?: unknown } }): void {
  const model = params.model;
  if (!model || !(model in ADDRESS_FIELDS)) return;

  const addressFields = ADDRESS_FIELDS[model];

  // Normalize in data (create/update writes)
  if (params.args.data && typeof params.args.data === 'object') {
    for (const field of addressFields) {
      const data = params.args.data as Record<string, unknown>;
      if (typeof data[field] === 'string') {
        data[field] = (data[field] as string).toLowerCase();
      }
    }
  }

  // Normalize in where (read/update/delete queries)
  if (params.args.where && typeof params.args.where === 'object') {
    const where = params.args.where as Record<string, unknown>;
    for (const field of addressFields) {
      if (typeof where[field] === 'string') {
        where[field] = (where[field] as string).toLowerCase();
      }
    }
    // Handle nested where operators (AND, OR, NOT)
    for (const op of ['AND', 'OR', 'NOT'] as const) {
      const clause = where[op];
      if (Array.isArray(clause)) {
        for (const item of clause) {
          lowercaseWhere(item);
        }
      } else if (clause && typeof clause === 'object') {
        lowercaseWhere(clause);
      }
    }
  }
}

// Ensure a single instance of Prisma Client is used across the application
declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  client.$use(async (params, next) => {
    normalizeAddressFields(params);
    return next(params);
  });

  return client;
};

export const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
