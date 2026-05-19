require('dotenv/config');

const { spawnSync } = require('node:child_process');
const net = require('node:net');
const { existsSync } = require('node:fs');
const path = require('node:path');

const LOCAL_POSTGRES_PORT = 55432;
const LOCAL_POSTGRES_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const BACKEND_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BACKEND_DIR, '.local-postgres', 'data');
const LOG_FILE = path.join(
  BACKEND_DIR,
  '.local-postgres',
  'postgres-auto-start.log',
);
const PG_CTL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe';

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL || '';

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function shouldManageLocalPostgres() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) return false;

  return (
    LOCAL_POSTGRES_HOSTS.has(databaseUrl.hostname) &&
    Number(databaseUrl.port || 5432) === LOCAL_POSTGRES_PORT
  );
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: '127.0.0.1',
      port: LOCAL_POSTGRES_PORT,
    });

    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await canConnect()) return true;

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function main() {
  if (!shouldManageLocalPostgres()) return;

  if (await canConnect()) return;

  if (!existsSync(PG_CTL) || !existsSync(DATA_DIR)) {
    console.error(
      'PostgreSQL local nao encontrado. Verifique a instalacao e a pasta .local-postgres.',
    );
    process.exit(1);
  }

  const result = spawnSync(
    PG_CTL,
    ['-D', DATA_DIR, '-o', `-p ${LOCAL_POSTGRES_PORT}`, '-l', LOG_FILE, 'start'],
    {
      stdio: 'inherit',
      windowsHide: true,
    },
  );

  if (result.status !== 0 && result.status !== null) {
    process.exit(result.status);
  }

  if (!(await waitForPostgres())) {
    console.error('PostgreSQL local nao ficou disponivel na porta 55432.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
