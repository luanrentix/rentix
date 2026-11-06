'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const {databaseConnectionOptions}=require('./database-connection.cjs');
const qi=s=>'"'+s.replaceAll('"','""')+'"';
async function fingerprints(client){
  const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const result={};
  for(const {tablename:t} of tables)result[t]=(await client.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(h,',' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public.${qi(t)} t) q`)).rows[0];
  return result;
}
function tool(name,args,url,caPath){
  const configured=process.env.PG_BIN|| (process.platform==='win32'?'C:\\Program Files\\PostgreSQL\\18\\bin':null);
  const binary=configured?path.join(configured,name+(process.platform==='win32'?'.exe':'')):name;
  const remote=!['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const result=spawnSync(binary,[...args,'--host',url.hostname,'--port',url.port||'5432','--username',decodeURIComponent(url.username),'--dbname',decodeURIComponent(url.pathname.slice(1)),'--no-password'],{windowsHide:true,encoding:'utf8',timeout:600000,maxBuffer:8*1024*1024,
    env:{...process.env,PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:remote?'verify-full':'prefer',...(caPath?{PGSSLROOTCERT:caPath}:{})}});
  if(result.error||result.status!==0)throw new Error(name+' failed; review PostgreSQL tool, permissions and TLS settings privately.');
  return result.stdout;
}
async function createBackup(databaseUrl,file){
  const output=path.resolve(file);if(fs.existsSync(output))throw new Error('Never overwrite a backup.');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const options=databaseConnectionOptions(databaseUrl);const url=new URL(options.connectionString);
  let caPath;
  if(options.ssl?.ca){caPath=output+'.ca.crt';fs.writeFileSync(caPath,options.ssl.ca,{flag:'wx',mode:0o600});}
  const client=new Client(options);await client.connect();
  try{
    await client.query("SET TIME ZONE 'UTC'");await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot=(await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
    const before=await fingerprints(client);
    // All public application tables, schema, constraints, triggers, functions, sequences, credentials and blobs.
    // Supabase-managed auth/storage/global roles need the provider's independent disaster-recovery backup.
    tool('pg_dump',['--format=custom','--schema=public','--file',output,'--snapshot',snapshot],url,caPath);
    fs.chmodSync(output,0o600);
    await client.query('ROLLBACK');
    const manifest={format:1,scope:'Complete application public schema; Supabase-managed schemas and cluster globals excluded explicitly',databaseIdentity:crypto.createHash('sha256').update(url.host+url.pathname).digest('hex'),createdAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),bytes:fs.statSync(output).size,tables:before};
    fs.writeFileSync(output+'.json',JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});return manifest;
  }finally{await client.end();}
}
module.exports={fingerprints,tool,createBackup};
