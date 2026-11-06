'use strict';
// Production: SELECT/pg_dump only. Restore and migrations run solely on a NEW localhost database.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dotenv=require('dotenv');
const {Client}=require('pg');
const {connection}=require('./controlled-cleanup.cjs');
const {createBackup,tool,fingerprints}=require('../lib/release-backup.cjs');
const {apply,inspect}=require('../lib/migration-runner.cjs');
async function main(){
  if(!process.argv.includes('--allow-real-data-transfer'))throw new Error('Requires separate explicit approval to transfer real production data. Prefer rehearse-production-schema.cjs.');
  const sourceFile=process.argv[2],localFile=process.argv[3];if(!sourceFile||!localFile)throw new Error('Explicit source and local env required.');
  const source=dotenv.parse(fs.readFileSync(sourceFile));const sourceUrl=source.DATABASE_URL;
  const local=connection(localFile);
  if(!['localhost','127.0.0.1','[::1]'].includes(local.url.hostname))throw new Error('Restore target must be localhost.');
  const stamp=Date.now(), name='contrx_release_rehearsal_'+stamp;
  const dir=path.resolve('backups',name);fs.mkdirSync(dir,{recursive:true});
  const dump=path.join(dir,'application.dump');const backup=await createBackup(sourceUrl,dump);
  const admin=new Client(local);await admin.connect();
  try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
  const url=new URL(local.url);url.pathname='/'+name;
  tool('pg_restore',['--exit-on-error','--no-owner','--no-privileges',dump],url);
  const client=new Client({connectionString:url.href});await client.connect();
  try{
    await client.query("SET TIME ZONE 'UTC'");
    const restored=await fingerprints(client);
    if(JSON.stringify(restored)!==JSON.stringify(backup.tables))throw new Error('Restored application data differs from source snapshot.');
    const protectedBefore=(await client.query("SELECT id,email,senha_hash,papel,ativo,empresa_id FROM public.usuarios WHERE lower(email)=ANY($1::text[]) ORDER BY email",[['adm@contrx.com','luanathmra@gmail.com']])).rows;
    if(protectedBefore.length!==2)throw new Error('Protected identities inconsistent in rehearsal.');
    const result=await apply(client);const state=await inspect(client);
    if(state.problems.length||state.pending.length)throw new Error('Migration rehearsal incomplete.');
    const protectedAfter=(await client.query("SELECT id,email,senha_hash,papel,ativo,empresa_id FROM public.usuarios WHERE lower(email)=ANY($1::text[]) ORDER BY email",[['adm@contrx.com','luanathmra@gmail.com']])).rows;
    if(JSON.stringify(protectedBefore)!==JSON.stringify(protectedAfter))throw new Error('Protected credentials/permissions changed.');
    const counts=(await client.query('SELECT (SELECT count(*) FROM public.usuarios)::int AS users,(SELECT count(*) FROM public.empresas)::int AS companies,(SELECT count(*) FROM public.contratos)::int AS contracts')).rows[0];
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify(protectedAfter)).digest('hex');
    const report={passed:true,productionChanges:false,backupRestoredAndCompared:true,database:name,migrationsApplied:result.applied,remaining:state.pending.length,protectedIdentitiesUnchanged:true,protectedIdentityDigest:fingerprint,counts,backup:path.relative(process.cwd(),dump),scope:backup.scope};
    fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(report,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
  }finally{await client.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
