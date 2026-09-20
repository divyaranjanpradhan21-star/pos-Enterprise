import { PrismaClient } from '@prisma/client';

export class DatabaseClient {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }
    return DatabaseClient.instance;
  }

  /**
   * Executes a database operation within an explicit PostgreSQL transaction
   * with the tenant RLS context bound via `SET LOCAL app.current_tenant_id`.
   * Enforces BR-ISO-001 tenant isolation.
   */
  public static async withTenant<T>(
    tenantId: string,
    operation: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const prisma = DatabaseClient.getInstance();

    // Use interactive transaction to bind session variable locally
    return prisma.$transaction(async (tx) => {
      // Set the session variable local to this transaction
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      return operation(tx as unknown as PrismaClient);
    });
  }
}
