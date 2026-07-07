process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.fzmqrrxnxczeyxxrzjrv:ContrxERP2026Lh@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require',
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log(JSON.stringify(res.rows.map(r => r.table_name), null, 2));
}

main().catch(console.error).finally(() => client.end());
