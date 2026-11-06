'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const {connection}=require('./controlled-cleanup.cjs');
const {apply,inspect}=require('../lib/migration-runner.cjs');
async function main(){
  const source=connection(process.argv[2]||'.env');
  if(!['localhost','127.0.0.1','[::1]'].includes(source.url.hostname))throw new Error('Localhost required.');
  const name='contrx_release_migrations_'+Date.now();
  const admin=new Client(source);await admin.connect();
  try{await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
  const target=new URL(source.url);target.pathname='/'+name;
  const client=new Client({connectionString:target.href});await client.connect();
  try{
    const result=await apply(client);const state=await inspect(client);
    if(state.problems.length||state.pending.length)throw new Error('Migration state not clean.');
    const invalidRls=(await client.query("SELECT tablename FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname=t.schemaname WHERE t.schemaname='public' AND t.tablename LIKE 'vendas\\_%' ESCAPE '\\' AND NOT c.relrowsecurity")).rows;
    if(invalidRls.length)throw new Error('Sales RLS missing after release.');
    const repeated=await apply(client);if(repeated.applied.length)throw new Error('Repeat migration was not idempotent.');
    const output=path.resolve('backups',name+'.json');fs.writeFileSync(output,JSON.stringify({database:name,migrations:result.applied.length,allApplied:true,repeatSkipped:true,salesRlsEnabled:true,sourceDatabaseUnchanged:true},null,2),{flag:'wx',mode:0o600});console.log(output);
  }finally{await client.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
