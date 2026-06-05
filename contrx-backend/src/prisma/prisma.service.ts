import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function isSupabaseDatabaseUrl(databaseUrl: string): boolean {
  try {
    const { hostname } = new URL(databaseUrl);

    return hostname.includes('supabase.');
  } catch {
    return databaseUrl.includes('supabase.');
  }
}

function removeSslMode(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);

    url.searchParams.delete('sslmode');

    return url.toString();
  } catch {
    return databaseUrl.replace(/[?&]sslmode=require\b/, '');
  }
}

function shouldRejectUnauthorizedTls() {
  return process.env.CONTRX_DB_SSL_REJECT_UNAUTHORIZED !== 'false';
}

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

    const isSupabaseConnection = isSupabaseDatabaseUrl(databaseUrl);
    const pool = new Pool({
      connectionString: isSupabaseConnection
        ? removeSslMode(databaseUrl)
        : databaseUrl,
      ssl: isSupabaseConnection
        ? { rejectUnauthorized: shouldRejectUnauthorizedTls() }
        : undefined,
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
