'use strict';
// Only DDL and migration-history metadata leave production. All user data below is synthetic.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Client}=require('pg');
const {connection}=require('./controlled-cleanup.cjs');
const {tool}=require('../lib/release-backup.cjs');
const {apply,inspect}=require('../lib/migration-runner.cjs');
async function main(){
  const source=connection(process.argv[2]),local=connection(process.argv[3]);
  if(!['localhost','127.0.0.1','[::1]'].includes(local.url.hostname))throw new Error('Local restore required.');
  const resume=process.argv[4];
  if(resume&&!/^contrx_schema_rehearsal_\d+$/.test(resume))throw new Error('Only isolated schema-rehearsal databases can be resumed.');
  const name=resume||'contrx_schema_rehearsal_'+Date.now(),dir=path.resolve('backups',name);fs.mkdirSync(dir,{recursive:true});
  let history;
  if(!resume){
  const remote=new Client(source);await remote.connect();
  try{await remote.query('BEGIN READ ONLY');history=(await remote.query('SELECT id,checksum,finished_at,migration_name,rolled_back_at,started_at,applied_steps_count FROM public._prisma_migrations ORDER BY migration_name')).rows;await remote.query('ROLLBACK');}finally{await remote.end();}
  const caPath=path.join(dir,'ca.crt');if(source.ssl?.ca)fs.writeFileSync(caPath,source.ssl.ca,{mode:0o600});
  const dump=path.join(dir,'schema-only.dump');
  tool('pg_dump',['--schema-only','--format=custom','--schema=public','--file',dump],source.url,source.ssl?.ca?caPath:undefined);
  const admin=new Client(local);await admin.connect();try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
  const url=new URL(local.url);url.pathname='/'+name;
  // New PostgreSQL databases already contain public; do not drop it or ignore unrelated restore errors.
  const toc=tool('pg_restore',['--list',dump],url);
  const list=path.join(dir,'restore-list.txt');
  fs.writeFileSync(list,toc.split(/\r?\n/).filter(line=>!/^\d+;.*\bSCHEMA - public /.test(line)).join('\n'));
  tool('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--use-list',list,dump],url);
  }
  const url=new URL(local.url);url.pathname='/'+name;
  const db=new Client({connectionString:url.href});await db.connect();
  try{
    if(history)for(const m of history)await db.query('INSERT INTO public._prisma_migrations (id,checksum,finished_at,migration_name,rolled_back_at,started_at,applied_steps_count) VALUES ($1,$2,$3,$4,$5,$6,$7)',[m.id,m.checksum,m.finished_at,m.migration_name,m.rolled_back_at,m.started_at,m.applied_steps_count]);
    else history=(await db.query('SELECT migration_name FROM public._prisma_migrations')).rows;
    const existing=(await db.query('SELECT count(*)::int AS n FROM public.usuarios')).rows[0].n;
    if(existing)throw new Error('Rehearsal requires an empty synthetic user table.');
    const companies=[crypto.randomUUID(),crypto.randomUUID()];
    const bcrypt=require('bcrypt'),hash=await bcrypt.hash('SyntheticReleaseFixture!9',10);
    for(const id of companies)await db.query('INSERT INTO public.empresas (id,nome_fantasia,atualizado_em) VALUES ($1,$2,now())',[id,'Synthetic release company']);
    const users=[];
    for(const [i,email] of ['adm@contrx.com','luanathmra@gmail.com'].entries()){
      const id=crypto.randomUUID();users.push(id);
      await db.query('INSERT INTO public.usuarios (id,empresa_id,nome,email,senha_hash,papel,atualizado_em) VALUES ($1,$2,$3,$4,$5,$6,now())',[id,companies[i],'Synthetic release user',email,hash,'PROPRIETARIO']);
    }
    const before=(await db.query('SELECT id,email,senha_hash,papel,empresa_id,ativo FROM public.usuarios ORDER BY id')).rows;
    const migrated=await apply(db);const state=await inspect(db);
    if(state.pending.length||state.problems.length)throw new Error('Schema rehearsal incomplete.');
    const after=(await db.query('SELECT id,email,senha_hash,papel,empresa_id,ativo FROM public.usuarios ORDER BY id')).rows;
    if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Protected synthetic identities changed.');
    const codes=(await db.query('SELECT id,codigo_empresa FROM public.empresas')).rows;
    if(codes.some(c=>c.codigo_empresa!=='CTX-'+c.id.replaceAll('-','').slice(0,5).toUpperCase()))throw new Error('Company code conversion failed.');
    const result={passed:true,database:name,productionChanges:false,productionRowsCopied:0,schemaOnly:true,historyMetadataRows:history.length,syntheticUsers:users.length,protectedSyntheticIdentitiesUnchanged:true,migrationsApplied:migrated.applied,remaining:state.pending.length};
    fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify(result));
  }finally{await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
