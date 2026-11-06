'use strict';
const fs = require('node:fs');
const path = require('node:path');

// One TLS policy for application, backup, migrations and diagnostics.
function databaseConnectionOptions(databaseUrl, env = process.env) {
  if (!databaseUrl) throw new Error('Database connection is not configured.');
  const url = new URL(databaseUrl);
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL connection required.');
  const sslKeys = ['sslmode','sslrootcert','sslcert','sslkey','uselibpqcompat'];
  if (local) return { connectionString: url.href, connectionTimeoutMillis: 10000 };
  const isSupabase = /(^|\.)supabase\.(co|com)$/.test(url.hostname);
  const certificatePath = env.CONTRX_DB_SSL_CA_FILE || url.searchParams.get('sslrootcert');
  const ca = certificatePath ? fs.readFileSync(path.resolve(certificatePath), 'utf8')
    : isSupabase ? fs.readFileSync(path.resolve(__dirname, '../../certs/supabase-root.crt'), 'utf8') : undefined;
  for (const name of sslKeys) url.searchParams.delete(name);
  // A legacy false flag is deliberately ignored: remote TLS always verifies chain and hostname.
  return { connectionString: url.href, connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } };
}
module.exports = { databaseConnectionOptions };
