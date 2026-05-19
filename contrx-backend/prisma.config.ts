import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from 'dotenv';

import { defineConfig } from 'prisma/config';

const defaultEnvPath = resolve(process.cwd(), '.env');
const supabaseEnvPath = resolve(process.cwd(), '.env.supabase');

config({ path: defaultEnvPath });

function isPlaceholderDatabaseUrl(value: string | undefined) {
  if (!value) return true;

  return (
    value.includes('USER:PASSWORD') ||
    value.includes('HOST:PORT') ||
    value.includes('PROJECT_REF') ||
    value.includes('SENHA_DO_BANCO') ||
    value.includes('HOST_DO_SUPABASE')
  );
}

if (
  existsSync(supabaseEnvPath) &&
  (process.env.CONTRX_USE_SUPABASE_ENV === 'true' ||
    isPlaceholderDatabaseUrl(process.env.DIRECT_URL) ||
    isPlaceholderDatabaseUrl(process.env.DATABASE_URL))
) {
  config({ path: supabaseEnvPath, override: true });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
