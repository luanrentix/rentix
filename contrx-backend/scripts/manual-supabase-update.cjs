'use strict';
const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('dotenv');
const {Client}=require('pg');
const {databaseConnectionOptions}=require('./lib/database-connection.cjs');
const {inspect,apply}=require('./lib/migration-runner.cjs');
const {createBackup,tool}=require('./lib/release-backup.cjs');
const quoteIdentifier=value=>'"'+String(value).replaceAll('"','""')+'"';

async function createSupabaseTableBackup(client){
  const stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try{
    const tables=(await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'backup\\_%' ESCAPE '\\'
      ORDER BY tablename
    `)).rows.map(row=>row.tablename);
    const created=[];
    for(const table of tables){
      const backup=`backup_${table}_${stamp}`;
      if(Buffer.byteLength(backup,'utf8')>63)throw new Error(`Backup table name exceeds PostgreSQL limit: ${table}`);
      await client.query(`CREATE TABLE public.${quoteIdentifier(backup)} AS TABLE public.${quoteIdentifier(table)}`);
      await client.query(`ALTER TABLE public.${quoteIdentifier(backup)} ENABLE ROW LEVEL SECURITY`);
      await client.query(`REVOKE ALL PRIVILEGES ON TABLE public.${quoteIdentifier(backup)} FROM PUBLIC, anon, authenticated`);
      const count=(await client.query(`SELECT count(*)::text AS count FROM public.${quoteIdentifier(backup)}`)).rows[0].count;
      created.push({source:table,backup,rows:count});
    }
    await client.query('COMMIT');
    return {stamp,tables:created};
  }catch(error){
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(){
  const args=process.argv.slice(2),pos=args.indexOf('--env');
  if(pos<0||!args[pos+1])throw new Error('Explicit --env is required.');
  const env=dotenv.parse(fs.readFileSync(path.resolve(args[pos+1])));
  const raw=env.DIRECT_URL||env.DATABASE_URL;
  const config=databaseConnectionOptions(raw,env);const url=new URL(config.connectionString);
  if(url.hostname!=="aws-1-sa-east-1.pooler.supabase.com" || url.port!=="5432" || decodeURIComponent(url.username)!=="postgres.huyvrkmhyozhespwmfpg" || url.pathname!=="/postgres" || config.ssl?.rejectUnauthorized!==true)throw new Error("Destino nao autorizado: utilize exclusivamente o projeto Supabase de Sao Paulo com SSL seguro.");
  if(url.port==='6543')throw new Error('Use DIRECT_URL or a session pooler on port 5432 for migrations, not transaction pooling.');
  const client=new Client(config);await client.connect();
  try{
    await client.query('BEGIN READ ONLY');const state=await inspect(client);await client.query('ROLLBACK');
    console.log(JSON.stringify({target:url.hostname+url.pathname,pending:state.pending.map(m=>m.name),problems:state.problems}));
    if(state.problems.length)throw new Error('Migration history failed verification.');
    if(args.includes('--require-current')&&state.pending.length)throw new Error('Update Supabase with menu option 2 before deployment.');
    if(!args.includes('--apply'))return;
    if(!args.includes('--confirm-backup-e-migrar'))throw new Error('Manual confirmation required for exporting real application data and applying migrations.');
    const file=path.resolve(__dirname,'../backups','pre-release-'+Date.now()+'.dump');
    const manifest=await createBackup(raw,file);
    tool('pg_restore',['--list',file],url);
    console.log(JSON.stringify({backup:file,sha256:manifest.sha256,scope:manifest.scope,archiveVerified:true,actualDataRestoreTest:false}));
    const supabaseBackup=await createSupabaseTableBackup(client);
    console.log(JSON.stringify({supabaseTableBackup:supabaseBackup,overwriteExisting:false}));
    if(!state.pending.length){console.log('Database already current. Backup created; no migrations were applied.');return;}
    console.log(JSON.stringify(await apply(client)));
  }finally{await client.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
