import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from 'dotenv';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';

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
    isPlaceholderDatabaseUrl(process.env.DATABASE_URL))
) {
  config({ path: supabaseEnvPath, override: true });
}

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length
    ? configuredOrigins
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://contrx.com.br',
        'https://www.contrx.com.br',
        'https://app.contrx.com.br',
      ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  console.log('Contrx Backend Running');
  await app.listen(port);

  console.log('🚀 Contrx Backend Running');
}

void bootstrap();
