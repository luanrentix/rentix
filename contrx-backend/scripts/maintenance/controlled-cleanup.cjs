/* Manual maintenance only. No import from startup, deploy, or migrations. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');
const dotenv = require('dotenv');
const { databaseConnectionOptions } = require('../lib/database-connection.cjs');
const PROTECTED = Object.freeze(['adm@contrx.com', 'luanathmra@gmail.com']);
const qi = value => '"' + String(value).replaceAll('"', '""') + '"';
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key = (table, id) => `${table}:${id}`;
const knownTables = new Set(Prisma.dmmf.datamodel.models.map(m => m.dbName || m.name));
const normalize = value => String(value || '').trim().toLowerCase();
const sorted = values => [...values].sort();

async function inventory(client) {
  const tables = (await client.query(`SELECT c.relname AS name, c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force_rls, c.relkind, c.relowner::regrole::text AS owner,
    c.relacl::text AS grants FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname`)).rows;
  const columns = (await client.query(`SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' ORDER BY table_name, ordinal_position`)).rows;
  const constraints = (await client.query(`SELECT c.conname AS name, c.contype AS type,
    ns.nspname AS schema, cl.relname AS child, nr.nspname AS parent_schema, cr.relname AS parent,
    c.confdeltype AS delete_action, c.convalidated AS validated, pg_get_constraintdef(c.oid) AS definition,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY x(num,ord)
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=x.num ORDER BY x.ord) AS columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY x(num,ord)
      JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=x.num ORDER BY x.ord) AS parent_columns
    FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=cl.relnamespace
    LEFT JOIN pg_class cr ON cr.oid=c.confrelid LEFT JOIN pg_namespace nr ON nr.oid=cr.relnamespace
    WHERE ns.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY ns.nspname,cl.relname,c.conname`)).rows;
  const triggers = (await client.query(`SELECT n.nspname AS schema,c.relname AS table,t.tgname AS name,
    pg_get_triggerdef(t.oid) AS definition, pg_get_functiondef(p.oid) AS function
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY n.nspname,c.relname,t.tgname`)).rows;
  const policies = (await client.query(`SELECT * FROM pg_policies ORDER BY schemaname,tablename,policyname`)).rows;
  const functions = (await client.query(`SELECT n.nspname AS schema,p.proname AS name,p.prosecdef AS security_definer,
    p.proconfig AS config, pg_get_functiondef(p.oid) AS definition FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
    ORDER BY p.proname,p.oid`)).rows;
  const indexes = (await client.query(`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
    WHERE schemaname='public' ORDER BY tablename,indexname`)).rows;
  const extensions = (await client.query('SELECT extname,extversion FROM pg_extension ORDER BY extname')).rows;
  const schemas = (await client.query(`SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema' ORDER BY schema_name`)).rows;
  const otherTables = (await client.query(`SELECT n.nspname AS schema,c.relname AS name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p','f') AND n.nspname NOT LIKE 'pg_%'
    AND n.nspname NOT IN ('information_schema','public') ORDER BY n.nspname,c.relname`)).rows;
  const rules = (await client.query(`SELECT schemaname,tablename,rulename,definition FROM pg_rules
    WHERE schemaname='public' ORDER BY tablename,rulename`)).rows;
  return { tables, columns, constraints, triggers, policies, functions, indexes, extensions, schemas, otherTables, rules };
}

async function snapshot(client, catalog) {
  const result = {};
  const identities = catalog.tables.some(t => t.name === 'usuarios')
    ? (await client.query('SELECT id,empresa_id FROM public.usuarios WHERE lower(trim(email))=ANY($1::text[])', [PROTECTED])).rows : [];
  const protectedReferences = [...PROTECTED, ...identities.flatMap(u => [u.id,u.empresa_id]).filter(Boolean)];
  for (const table of catalog.tables) {
    const cols = catalog.columns.filter(c => c.table_name === table.name).map(c => c.column_name);
    const refs = catalog.constraints.filter(c => c.schema === 'public' && c.child === table.name && c.type === 'f').flatMap(c => c.columns);
    const parents = catalog.constraints.filter(c => c.parent_schema === 'public' && c.parent === table.name && c.type === 'f').flatMap(c => c.parent_columns);
    const fields = new Set([...refs, ...parents, ...['id','empresa_id','usuario_id','responsavel_id','email_usuario','entidade_id'].filter(c => cols.includes(c))]);
    if (table.name === 'usuarios') for (const c of ['email','ativo','papel']) if (cols.includes(c)) fields.add(c);
    if (table.name === 'empresas' && cols.includes('nome_fantasia')) fields.add('nome_fantasia');
    if (table.name === 'arquivos_sistema' && cols.includes('url')) fields.add('url');
    const fieldsSql = [...fields].map(c => `t.${qi(c)}`).join(',');
    const identityChecks = table.name === 'usuarios'
      ? `left(t.senha_hash,4) IN ('$2a$','$2b$','$2y$') AND length(t.senha_hash)=60 AS __credential_valid,
        ${cols.includes('login_email_habilitado') && cols.includes('login_usuario_habilitado')
          ? '(t.login_email_habilitado OR t.login_usuario_habilitado)' : 'true'} AS __login_enabled,` : '';
    // Fingerprints protect credentials/data without exporting them in the report.
    const rows = (await client.query(`SELECT ${fieldsSql ? fieldsSql + ',' : ''} ${identityChecks}
      md5(to_jsonb(t)::text) AS __hash,
      ${table.name === 'usuarios' ? "(to_jsonb(t) - 'empresa_id')" : 'to_jsonb(t)'}::text ~* $1 AS __mentions_protected_email
      FROM public.${qi(table.name)} t ORDER BY md5(to_jsonb(t)::text)`, [protectedReferences.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')])).rows;
    result[table.name] = rows;
  }
  return result;
}

function plan(catalog, rows) {
  const blockers = [];
  const users = rows.usuarios || [];
  const companies = rows.empresas || [];
  const protectedUsers = [];
  for (const email of PROTECTED) {
    const matches = users.filter(u => normalize(u.email) === email);
    if (matches.length !== 1) blockers.push(`Protected identity ${email}: expected 1, found ${matches.length}`);
    else {
      protectedUsers.push(matches[0]);
      if (!matches[0].ativo) blockers.push(`Protected identity inactive: ${email}`);
      if (matches[0].__credential_valid === false || matches[0].__login_enabled === false) blockers.push(`Protected identity authentication inconsistent: ${email}`);
      if (!companies.some(c => c.id === matches[0].empresa_id)) blockers.push(`Missing protected company: ${email}`);
    }
  }
  const protectedIds = new Set(protectedUsers.map(u => u.id));
  const protectedCompanies = new Set(protectedUsers.map(u => u.empresa_id));
  const candidateUsers = users.filter(u => !PROTECTED.includes(normalize(u.email)));
  const candidateIds = new Set(candidateUsers.map(u => u.id));
  // A company with no known users has uncertain ownership and is preserved.
  const candidateCompanies = companies.filter(c => !protectedCompanies.has(c.id) && candidateUsers.some(u => u.empresa_id === c.id));
  const companyIds = new Set(candidateCompanies.map(c => c.id));
  const nodes = new Map();
  const remove = new Set();
  for (const [table, items] of Object.entries(rows)) {
    const pk = catalog.constraints.find(c => c.schema === 'public' && c.child === table && c.type === 'p');
    const supported = knownTables.has(table) && pk?.columns.length === 1 && pk.columns[0] === 'id';
    if (!supported && items.length && table !== '_prisma_migrations') blockers.push(`Unknown table/primary key requires review: ${table}`);
    for (const row of items) {
      const id = row.id;
      if (id == null) continue;
      const node = key(table, id);
      nodes.set(node, { table, row, supported });
      if (!supported) continue;
      let selected = table === 'usuarios' ? candidateIds.has(id)
        : table === 'empresas' ? companyIds.has(id)
          : row.empresa_id != null ? companyIds.has(row.empresa_id)
            : row.usuario_id != null && candidateIds.has(row.usuario_id);
      if (protectedIds.has(row.usuario_id) || protectedIds.has(row.responsavel_id)) selected = false;
      if (table !== 'usuarios' && protectedCompanies.has(row.empresa_id)) selected = false;
      if (selected && row.__mentions_protected_email) {
        blockers.push(`Protected identity/email/company mentioned in proposed deletion: ${node}`); selected = false;
      }
      if (selected) remove.add(node);
    }
  }
  const fks = catalog.constraints.filter(c => c.type === 'f');
  // Unknown-schema dependencies are never silently skipped, even ON DELETE CASCADE/SET NULL.
  for (const fk of fks) if ((fk.schema === 'public') !== (fk.parent_schema === 'public')) {
    blockers.push(`Cross-schema foreign key: ${fk.schema}.${fk.child}.${fk.name}`);
  }
  const edges = [];
  for (const fk of fks.filter(c => c.schema === 'public' && c.parent_schema === 'public')) {
    const index = new Map((rows[fk.parent] || []).map(r => [JSON.stringify(fk.parent_columns.map(c => r[c])), r]));
    for (const child of rows[fk.child] || []) {
      if (fk.columns.some(c => child[c] == null)) continue;
      const parent = index.get(JSON.stringify(fk.columns.map(c => child[c])));
      if (!parent) { blockers.push(`Orphan or inaccessible FK: ${fk.child}:${child.id}/${fk.name}`); continue; }
      edges.push([key(fk.child, child.id), key(fk.parent, parent.id)]);
    }
  }
  // Soft references in known schema: history actors, revocation actors, file polymorphic entities.
  for (const [node, { table, row }] of nodes) {
    for (const col of ['usuario_id','responsavel_id']) {
      if (users.some(u => u.id === row[col])) edges.push([node, key('usuarios', row[col])]);
    }
    if (table === 'arquivos_sistema') {
      for (const [parent, { row: other }] of nodes) if (other.id === row.entidade_id) edges.push([node, parent]);
      if (remove.has(node) && !String(row.url || '').startsWith('data:')) blockers.push(`External/legacy file requires independent backup/recovery: ${node}`);
    }
  }
  // Ownership is explicit, never inferred from arbitrary cascading foreign keys.
  // These child tables have no empresa_id in the actual Prisma schema.
  const exclusiveChildren = {
    pagamentos_recebidos: ['conta_receber_id', 'contas_receber'],
    pagamentos_realizados: ['conta_pagar_id', 'contas_pagar'],
    assinaturas_contrato: ['contrato_id', 'contratos'],
  };
  const inheritedOwnership = [];
  for (const [node, { table, row, supported }] of nodes) {
    const rule = exclusiveChildren[table];
    if (!rule || !supported || remove.has(node) || row.empresa_id != null ||
        row.__mentions_protected_email || protectedIds.has(row.usuario_id) ||
        protectedIds.has(row.responsavel_id)) continue;
    const [column, parentTable] = rule;
    const verifiedFk = fks.some(fk => fk.schema === 'public' && fk.child === table &&
      fk.parent_schema === 'public' && fk.parent === parentTable &&
      JSON.stringify(fk.columns) === JSON.stringify([column]) &&
      JSON.stringify(fk.parent_columns) === JSON.stringify(['id']));
    const parentNode = key(parentTable, row[column]);
    if (!verifiedFk && remove.has(parentNode)) {
      blockers.push(`Missing ownership foreign key requires review: ${node} -> ${parentNode}`);
    }
    const parents = edges.filter(([child]) => child === node).map(([, parent]) => parent);
    if (!verifiedFk || !remove.has(parentNode) || !parents.length ||
        parents.some(parent => !remove.has(parent))) continue;
    remove.add(node);
    inheritedOwnership.push({ node, owner: parentNode, reason: 'Verified exclusive parent; all referenced parents selected' });
  }
  for (const [child, parent] of edges) {
    if (child !== parent && remove.has(parent) && !remove.has(child)) blockers.push(`Shared reference retained -> candidate: ${child} -> ${parent}`);
  }
  // Row-level topological ordering handles product grades and other self references.
  const pending = new Map([...remove].map(n => [n, new Set()]));
  for (const [child, parent] of edges) if (child !== parent && remove.has(child) && remove.has(parent)) pending.get(parent).add(child);
  const order = [];
  while (pending.size) {
    const leaves = sorted([...pending].filter(([, deps]) => deps.size === 0).map(([n]) => n));
    if (!leaves.length) { blockers.push(`Dependency cycle: ${sorted(pending.keys()).join(', ')}`); break; }
    for (const node of leaves) { order.push(node); pending.delete(node); }
    for (const deps of pending.values()) for (const node of leaves) deps.delete(node);
  }
  return {
    protectedUsers: protectedUsers.map(u => ({ id: u.id, email: u.email, companyId: u.empresa_id, active: u.ativo })),
    candidateUsers: candidateUsers.map(u => ({ id: u.id, email: u.email, companyId: u.empresa_id })),
    protectedCompanies: sorted(protectedCompanies), candidateCompanies: candidateCompanies.map(c => ({ id: c.id, name: c.nome_fantasia })),
    orphanCompaniesPreserved: companies.filter(c => !protectedCompanies.has(c.id) && !companyIds.has(c.id)).map(c => c.id),
    tables: Object.entries(rows).map(([table, records]) => ({ table, total: records.length,
      remove: records.filter(r => remove.has(key(table, r.id))).map(r => ({ id: r.id, hash: r.__hash })),
      preserved: records.filter(r => !remove.has(key(table, r.id))).length })),
    inheritedOwnership, order, blockers: sorted(new Set(blockers)),
  };
}

async function externalInventory(client) {
  const external = {};
  for (const table of ['auth.users','auth.identities','storage.objects','storage.buckets']) {
    const exists = (await client.query('SELECT to_regclass($1)::text AS name', [table])).rows[0].name;
    if (!exists) { external[table] = { exists: false }; continue; }
    const count = (await client.query(`SELECT count(*)::text AS total FROM ${table.split('.').map(qi).join('.')}`)).rows[0].total;
    external[table] = { exists: true, total: count };
    if (table === 'auth.users') external[table].protected = (await client.query(`SELECT id,email FROM auth.users WHERE lower(trim(email))=ANY($1::text[]) ORDER BY id`, [PROTECTED])).rows;
  }
  return external;
}

async function report(client, target) {
  const identity = (await client.query(`SELECT current_database() AS database, current_user AS role,
    inet_server_addr()::text AS server, inet_server_port() AS port,
    current_setting('server_version') AS version`)).rows[0];
  const catalog = await inventory(client);
  const rows = await snapshot(client, catalog);
  const proposed = plan(catalog, rows);
  const external = await externalInventory(client);
  if (catalog.otherTables.length) proposed.blockers.push('Tables outside public require full independent ownership review; external deletion is not implemented.');
  if (catalog.rules.length) proposed.blockers.push('Rewrite rules require explicit implementation review.');
  for (const [name, data] of Object.entries(external)) if (Number(data.total) > 0) proposed.blockers.push(`External authentication/storage requires independent reconciliation: ${name} (${data.total})`);
  if (catalog.tables.some(t => t.relkind !== 'r')) proposed.blockers.push('Partitioned tables require explicit implementation review.');
  const role = (await client.query('SELECT rolbypassrls,rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0];
  if (!role.rolsuper && !role.rolbypassrls) proposed.blockers.push('Inventory requires complete visibility (BYPASSRLS/superuser); partial RLS view is unsafe.');
  const migrations = rows._prisma_migrations ? (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows : [];
  const targetId = digest({ target, database: identity.database, server: identity.server, port: identity.port });
  const snapshotHash = digest(Object.entries(rows).map(([table, data]) => [table, data.map(r => r.__hash).sort()]));
  const schemaHash = digest(catalog);
  const result = { format: 1, targetId, identity: { ...identity, server: '[redacted]' }, schemaHash, snapshotHash,
    authentication: 'Application public.usuarios + bcrypt + JWT; Supabase Auth, if present, is blocked for independent review.',
    external, catalog, migrations, totalUsers: (rows.usuarios || []).length, ...proposed };
  result.planHash = digest({ targetId, schemaHash, snapshotHash, proposed, external });
  return { result, rows };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  // Reports contain identifiers/PII. Keep under ignored backups with restrictive Unix permissions.
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

function connection(envFile, variable = 'DATABASE_URL') {
  if (!envFile) throw new Error('Explicit --env <file> required. No automatic production environment selection.');
  const env = dotenv.parse(fs.readFileSync(path.resolve(envFile)));
  const value = env[variable];
  if (!value) throw new Error(`${variable} missing in explicit environment file.`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL required.');
  return { ...databaseConnectionOptions(value, env), url };
}

function pgTool(tool, args, config, extraEnv = {}) {
  const binary = process.env.PG_BIN ? path.join(process.env.PG_BIN, tool + (process.platform === 'win32' ? '.exe' : '')) : tool;
  const u = config.url;
  const result = spawnSync(binary, [...args, '--host', u.hostname, '--port', u.port || '5432', '--username', decodeURIComponent(u.username), '--dbname', decodeURIComponent(u.pathname.slice(1)), '--no-password'], {
    env: { ...process.env, ...extraEnv, PGPASSWORD: decodeURIComponent(u.password), PGSSLMODE: u.searchParams.get('sslmode') || 'prefer' },
    encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 8 * 1024 * 1024,
  });
  // No stderr/URL/credential leakage in public output.
  if (result.error || result.status !== 0) throw new Error(`${tool} failed (exit ${result.status}); review database/tool configuration privately.`);
  return result;
}

async function backupAndRestore(client, config, restoreConfig, output, before) {
  if (!['localhost','127.0.0.1','[::1]'].includes(restoreConfig.url.hostname) ||
      !decodeURIComponent(restoreConfig.url.pathname.slice(1)).startsWith('contrx_cleanup_restore_')) throw new Error('Restore target must be a separate localhost database named contrx_cleanup_restore_*.');
  if (restoreConfig.url.pathname === config.url.pathname && restoreConfig.url.hostname === config.url.hostname) throw new Error('Restore cannot target source.');
  const restore = new Client(restoreConfig);
  await restore.connect();
  await restore.query("SET TIME ZONE 'UTC'");
  try {
    const existing = (await restore.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','v','m','S')`)).rows[0].n;
    if (existing) throw new Error('Restore test database must be empty. Nothing was overwritten.');
  } finally { await restore.end(); }
  const dump = path.resolve(output + '.dump');
  if (fs.existsSync(dump)) throw new Error('Backup path exists; never overwrite.');
  const exported = (await client.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
  pgTool('pg_dump', ['--format=custom','--file',dump,'--snapshot',exported], config);
  fs.chmodSync(dump, 0o600);
  // Full database archive, including credentials/blobs/schema. Globals/roles need separate DBA backup.
  const hash = crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex');
  pgTool('pg_restore', ['--exit-on-error','--no-owner','--no-privileges',dump], restoreConfig);
  const check = new Client(restoreConfig);
  await check.connect();
  await check.query("SET TIME ZONE 'UTC'");
  let restoredHash;
  try {
    await check.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const catalog = await inventory(check);
    const restored = await snapshot(check, catalog);
    restoredHash = digest(Object.entries(restored).map(([table, data]) => [table, data.map(r => r.__hash).sort()]));
    if (restoredHash !== before.snapshotHash) throw new Error('Restore data fingerprints do not match source snapshot.');
    await check.query('ROLLBACK');
  } finally { await check.end(); }
  const manifest = { dump, sha256: hash, bytes: fs.statSync(dump).size, targetId: before.targetId,
    sourceSnapshotHash: before.snapshotHash, restoredSnapshotHash: restoredHash, restoreTestPassed: true,
    testedAt: new Date().toISOString(), restoreDatabase: decodeURIComponent(restoreConfig.url.pathname.slice(1)) };
  writeJson(output + '.backup.json', manifest);
  return manifest;
}

async function main(argv = process.argv.slice(2)) {
  const mode = argv[0];
  if (!['diagnose','dry-run','execute'].includes(mode)) throw new Error('Use diagnose|dry-run|execute --env <file> --out <new report.json>. See docs/limpeza-controlada.md.');
  const opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i+1] : undefined; };
  const config = connection(opt('--env'));
  const output = opt('--out');
  if (!output || fs.existsSync(output)) throw new Error('New --out file required; existing files are never overwritten.');
  const client = new Client({ ...config, application_name: `contrx-cleanup-${mode}` });
  await client.connect();
  await client.query("SET TIME ZONE 'UTC'");
  let transaction = false;
  let committed = false;
  try {
    if (!(await client.query('SELECT pg_try_advisory_lock(20261106, 7711) AS locked')).rows[0].locked) throw new Error('Another maintenance process holds the lock.');
    await client.query("SET statement_timeout='120s'");
    if (mode === 'execute') {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction = true;
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='120s'");
      const names = (await inventory(client)).tables.map(t => `public.${qi(t.name)}`);
      if (names.length) await client.query(`LOCK TABLE ${names.join(',')} IN SHARE ROW EXCLUSIVE MODE`);
    } else { await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); transaction = true; }
    const { result: before, rows } = await report(client, config.url.host + config.url.pathname);
    if (mode !== 'execute') {
      writeJson(output, { ...before, mode, generatedAt: new Date().toISOString(), permanentChanges: false });
      await client.query('ROLLBACK'); transaction = false;
      console.log(JSON.stringify({ mode, report: path.resolve(output), totalUsers: before.totalUsers,
        candidateUsers: before.candidateUsers.length, candidateCompanies: before.candidateCompanies.length,
        proposedRows: before.order.length, blockers: before.blockers.length, planHash: before.planHash, permanentChanges: false }));
      return;
    }
    const approved = JSON.parse(fs.readFileSync(opt('--plan') || '', 'utf8'));
    const approval = JSON.parse(fs.readFileSync(opt('--approval') || '', 'utf8'));
    if (approved.mode !== 'dry-run' || before.planHash !== approved.planHash || approval.planHash !== before.planHash || approval.targetId !== before.targetId) throw new Error('Approved dry-run/target is stale or mismatched. Regenerate and review.');
    if (!approval.operator || !approval.legalRetentionReviewed || !approval.triggersReviewed || !approval.externalRecoveryReviewed || !approval.maintenanceWindowActive) throw new Error('Human approval must include operator, legal retention, trigger review, external recovery, and maintenance window.');
    if (!['production','isolated'].includes(approval.environment)) throw new Error('Explicit approval environment required.');
    const expected = `${approval.environment === 'production' ? 'LIMPAR PRODUCAO' : 'LIMPAR BASE ISOLADA'} ${before.planHash}`;
    if (opt('--confirm') !== expected) throw new Error('Exact manual environment-specific confirmation required.');
    if (before.blockers.length) throw new Error(`Execution blocked: ${before.blockers.length} unresolved dependencies. No automatic override exists.`);
    // No deletion begins before a complete backup has actually been restored and verified.
    const backup = await backupAndRestore(client, config, connection(opt('--restore-env')), output, before);
    writeJson(output + '.intent.json', { startedAt: new Date().toISOString(), before, approval, backup });
    for (const node of before.order) {
      const colon = node.indexOf(':'); const table = node.slice(0,colon); const id = node.slice(colon+1);
      const expectedRow = rows[table].find(r => String(r.id) === id);
      const removed = await client.query(`DELETE FROM public.${qi(table)} t WHERE t.id::text=$1 AND md5(to_jsonb(t)::text)=$2 RETURNING id`, [id, expectedRow.__hash]);
      if (removed.rowCount !== 1) throw new Error(`Concurrent change or trigger mismatch: ${node}`);
    }
    const afterCatalog = await inventory(client);
    const after = await snapshot(client, afterCatalog);
    const deletionSet = new Set(before.order);
    for (const [table, original] of Object.entries(rows)) {
      const remaining = original.filter(r => !deletionSet.has(key(table,r.id))).map(r => r.__hash).sort();
      const actual = (after[table] || []).map(r => r.__hash).sort();
      if (JSON.stringify(remaining) !== JSON.stringify(actual)) throw new Error(`Preserved data changed or unplanned cascade/trigger at ${table}. Rolling back.`);
    }
    // Precommit record survives a crash; success is only recorded after COMMIT returns.
    writeJson(output + '.precommit.json', { planHash: before.planHash, validatedAt: new Date().toISOString(), deleted: before.order });
    await client.query('COMMIT'); transaction = false; committed = true;
    writeJson(output, { mode, committed: true, finishedAt: new Date().toISOString(), planHash: before.planHash,
      targetId: before.targetId, protectedUsers: before.protectedUsers, removed: before.tables.map(t => ({ table:t.table, count:t.remove.length })), backup });
    console.log(JSON.stringify({ committed: true, report: path.resolve(output) }));
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    console.error(JSON.stringify({ error: error.message, committed, note: committed ? 'COMMIT succeeded; preserve intent/precommit/backup and reconcile final report.' : 'No confirmed COMMIT. If connection failed during COMMIT, reconcile intent and database before retry.' }));
    process.exitCode = 1;
  } finally {
    await client.end(); // session advisory lock released even on failure
  }
}
module.exports = { PROTECTED, inventory, snapshot, plan, report, digest, connection, main };
if (require.main === module) main().catch(() => { console.error('Maintenance initialization failed; check explicit configuration privately.'); process.exitCode = 1; });
