import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { PoolConfig } from 'pg';
const loadDatabaseConfig = createRequire(
  resolve(process.cwd(), 'package.json'),
);
const { databaseConnectionOptions } = loadDatabaseConfig(
  './scripts/lib/database-connection.cjs',
) as { databaseConnectionOptions: (url: string) => PoolConfig };

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

    const pool = new Pool(databaseConnectionOptions(databaseUrl));
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
