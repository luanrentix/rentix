// Explicit local-only maintenance. Never called by startup or deployment scripts.
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const allowedMigrations = ['20261106150000_company_login_user_sessions', '20261106160000_user_login_methods_optional_email', '20261106170000_short_company_codes', '20261106180000_company_code_from_id', '20261106190000_grid_product_codes', '20261106200000_product_price_history_permissions', '20261106210000_seller_registration'];
const migrationFlag = process.argv.indexOf('--migration');
const name = migrationFlag >= 0 ? process.argv[migrationFlag + 1] : allowedMigrations[0];
if (!allowedMigrations.includes(name)) throw new Error('Migracao fora do escopo permitido.');
const backupDir = path.resolve(__dirname, '../backups');
const pgBin = 'C:\\Program Files\\PostgreSQL\\18\\bin';

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('A operação exige DATABASE_URL local.');
  const db = decodeURIComponent(url.pathname.slice(1));
  if (!db) throw new Error('Nome do banco ausente.');
  const identity = crypto.createHash('sha256').update(`${url.hostname}:${url.port || 5432}/${db}`).digest('hex');
  if (process.argv[2] === '--backup') {
    fs.mkdirSync(backupDir, { recursive: true });
    const dump = path.join(backupDir, `pre-auth-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
    const result = spawnSync(path.join(pgBin, 'pg_dump.exe'), ['--no-password', '--format=custom', '--file', dump, '--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), '--dbname', db], {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) }, windowsHide: true, encoding: 'utf8',
    });
    if (result.error || result.status !== 0) throw new Error('Falha ao gerar o backup local: ' + (result.error?.message || result.stderr));
    const verification = spawnSync(path.join(pgBin, 'pg_restore.exe'), ['--list', dump], { windowsHide: true, encoding: 'utf8' });
    if (verification.status !== 0 || fs.statSync(dump).size < 100) throw new Error('Backup não passou na verificação de arquivo.');
    fs.writeFileSync(dump + '.json', JSON.stringify({ databaseIdentity: identity, sha256: crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex'), createdAt: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ backup: dump, verifiedArchive: true, bytes: fs.statSync(dump).size }));
    return;
  }
  if (process.argv[2] !== '--apply' || !process.argv[3]) throw new Error('Use --backup ou --apply <backup.dump>. O backend deve estar parado ao aplicar.');
  const dump = path.resolve(process.argv[3]);
  if (path.dirname(dump) !== backupDir) throw new Error('Backup deve pertencer à pasta local de backups.');
  const manifest = JSON.parse(fs.readFileSync(dump + '.json', 'utf8'));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex');
  if (manifest.databaseIdentity !== identity || manifest.sha256 !== hash) throw new Error('Backup incompatível ou alterado.');
  const source = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8');
  const sql = source.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    await client.query('SELECT pg_advisory_xact_lock(20261106, 150000)');
    const previous = await client.query('SELECT finished_at, rolled_back_at FROM public._prisma_migrations WHERE migration_name=$1', [name]);
    if (previous.rows.length) throw new Error('Migração já possui registro. Verifique o histórico antes de repetir.');
    const sessionCount = name === allowedMigrations[0] ? '(SELECT count(*)::int FROM public.usuarios WHERE sessao_ativa_id IS NOT NULL AND ultimo_login_em IS NOT NULL)' : '(SELECT count(*)::int FROM public.usuarios_sessoes)';
    const baseline = (await client.query(`SELECT (SELECT count(*)::int FROM public.empresas) AS companies, (SELECT count(*)::int FROM public.usuarios) AS users, ${sessionCount} AS legacy_sessions`)).rows[0];
    await client.query(sql);
    const after = (await client.query('SELECT (SELECT count(*)::int FROM public.empresas) AS companies, (SELECT count(*)::int FROM public.usuarios) AS users, (SELECT count(*)::int FROM public.usuarios_sessoes) AS legacy_sessions')).rows[0];
    if (JSON.stringify(baseline) !== JSON.stringify(after)) throw new Error('Contagens divergentes após a migração. Operação revertida.');
    await client.query('INSERT INTO public._prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)', [crypto.randomUUID(), crypto.createHash('sha256').update(source).digest('hex'), name]);
    await client.query('COMMIT');
    console.log(JSON.stringify({ applied: name, migrationHistoryRecorded: true, backup: dump }));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
