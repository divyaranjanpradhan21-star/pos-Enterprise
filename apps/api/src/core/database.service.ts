import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@pos/db';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    if (process.env['DATABASE_URL']) {
      try {
        await this.$connect();
        console.log('✅ Connected to Supabase PostgreSQL database');
      } catch (error) {
        console.warn('⚠️ Database connection warning during startup:', (error as Error).message);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Executes a database query inside an explicit transaction with RLS
   * session parameter `app.current_tenant_id` set to the verified tenantId.
   */
  async withTenant<T>(tenantId: string, fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      return fn(tx as unknown as PrismaClient);
    });
  }
}
