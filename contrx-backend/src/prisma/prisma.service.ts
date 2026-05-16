import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }

    const isSupabaseConnection = databaseUrl.includes('supabase.com');
    const pool = new Pool({
      connectionString: isSupabaseConnection
        ? databaseUrl.replace(/\?sslmode=require.*/, '')
        : databaseUrl,
      ssl: isSupabaseConnection ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool, {
      disposeExternalPool: true,
    });

    super({
      adapter,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
