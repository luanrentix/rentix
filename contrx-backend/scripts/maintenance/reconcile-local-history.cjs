'use strict';
// Local development repair only. Never used by startup, migrations or deployment.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Client}=require('pg');
const {connection}=require('./controlled-cleanup.cjs');
const {createBackup,fingerprints}=require('../lib/release-backup.cjs');
const {apply,inspect,sources}=require('../lib/migration-runner.cjs');
const qi=s=>'"'+s.replaceAll('"','""')+'"';
async function shape(client,table){
  return {
    columns:(await client.query('SELECT column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY column_name',['public',table])).rows,
    constraints:(await client.query('SELECT c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND t.relname=$2 ORDER BY c.conname',['public',table])).rows,
    indexes:(await client.query('SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename=$2 ORDER BY indexname',['public',table])).rows,
  };
}
async function main(){
  const config=connection(process.argv[2]);const cleanName=process.argv[3];
  if(!['localhost','127.0.0.1','[::1]'].includes(config.url.hostname)||!/^contrx_release_migrations_\d+$/.test(cleanName||''))throw new Error('Requires a localhost source and a freshly validated local reference schema.');
  const cleanUrl=new URL(config.url);cleanUrl.pathname='/'+cleanName;
  const db=new Client(config),clean=new Client({connectionString:cleanUrl.href});await db.connect();await clean.connect();
  try{
    await db.query("SET TIME ZONE 'UTC'");
    const state=await inspect(db);if(state.problems.length)throw new Error(state.problems.join('; '));
    const adopt=[];
    const unitTable='vendas_unidades_produtos';
    if(state.pending.some(m=>m.name==='20261105150000_add_sales_product_units')&&(await db.query('SELECT to_regclass($1)::text AS t',['public.'+unitTable])).rows[0].t){
      if(JSON.stringify(await shape(db,unitTable))!==JSON.stringify(await shape(clean,unitTable)))throw new Error('Units schema does not exactly match canonical migration.');
      adopt.push('20261105150000_add_sales_product_units');
    }
    if(state.pending.some(m=>m.name==='20261105160000_independent_grid_products')){
      const actual=await shape(db,'vendas_produtos'),expected=await shape(clean,'vendas_produtos');
      const columns=['matriz_grade','produto_grade_id','valor_grade','grade_id'];
      const constraints=['vendas_produtos_grade_cadastro_fkey','vendas_produtos_grade_empresa_fkey'];
      const indexes=['vendas_produtos_id_empresa_id_key','vendas_produtos_empresa_id_produto_grade_id_valor_grade_key','vendas_produtos_empresa_id_produto_grade_id_ativo_idx'];
      for(const [kind,names,prop] of [['columns',columns,'column_name'],['constraints',constraints,'conname'],['indexes',indexes,'indexname']]){
        const a=actual[kind].filter(x=>names.includes(x[prop])),b=expected[kind].filter(x=>names.includes(x[prop]));
        if(a.length!==names.length||JSON.stringify(a)!==JSON.stringify(b))throw new Error('Grid DDL not canonical: '+kind);
      }
      const a=await shape(db,'vendas_grades_produtos'),b=await shape(clean,'vendas_grades_produtos');
      const name='vendas_grades_produtos_id_empresa_id_key';
      if(JSON.stringify(a.indexes.find(x=>x.indexname===name))!==JSON.stringify(b.indexes.find(x=>x.indexname===name)))throw new Error('Grid unique index differs.');
      adopt.push('20261105160000_independent_grid_products');
    }
    if(state.pending.some(m=>m.name==='20261105170000_sales_reference_customers')){
      const a=await shape(db,'vendas_clientes'),b=await shape(clean,'vendas_clientes');
      const col=a.columns.find(c=>c.column_name==='apenas_referencia');
      if(!col||JSON.stringify(col)!==JSON.stringify(b.columns.find(c=>c.column_name==='apenas_referencia')))throw new Error('Reference-customer column differs.');
      adopt.push('20261105170000_sales_reference_customers');
    }
    console.log(JSON.stringify({localOnly:true,verifiedExistingDdl:adopt,pending:state.pending.map(m=>m.name)}));
    if(!state.pending.length)return;
    if(!process.argv.includes('--apply'))return;
    const backup=path.resolve('backups','pre-local-reconcile-'+Date.now()+'.dump');
    await createBackup(config.connectionString,backup);
    const before=await fingerprints(db);
    await db.query('BEGIN');
    try{
      await db.query('LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE');
      for(const name of adopt){const source=sources().find(m=>m.name===name);await db.query('INSERT INTO public._prisma_migrations (id,checksum,migration_name,finished_at,logs,applied_steps_count) VALUES ($1,$2,$3,now(),$4,1)',[crypto.randomUUID(),source.checksum,name,'LOCAL ONLY: complete existing DDL compared with canonical fresh migrated database; no business rows changed.']);}
      await db.query('COMMIT');
    }catch(e){await db.query('ROLLBACK');throw e;}
    const result=await apply(db),after=await fingerprints(db);
    for(const [table,value] of Object.entries(before)){if(table==='_prisma_migrations')continue;if(JSON.stringify(value)!==JSON.stringify(after[table]))throw new Error('Business data changed unexpectedly: '+table);}
    const final=await inspect(db);if(final.pending.length||final.problems.length)throw new Error('Local state incomplete.');
    const report={passed:true,localOnly:true,sourceDatabase:config.url.pathname.slice(1),backup,adoptedAfterExactDdlComparison:adopt,applied:result.applied,businessDataUnchanged:true};
    fs.writeFileSync(backup+'.reconciliation.json',JSON.stringify(report,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
  }finally{await db.end();await clean.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
