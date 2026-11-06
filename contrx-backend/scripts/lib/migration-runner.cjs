'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../../prisma/migrations');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function sources(){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&fs.existsSync(path.join(dir,e.name,'migration.sql'))).map(e=>{
  const raw=fs.readFileSync(path.join(dir,e.name,'migration.sql'),'utf8');
  const lf=raw.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  return {name:e.name,sql:lf,checksum:hash(lf),accepted:[raw,raw.trim(),lf,lf.trim(),lf.replaceAll('\n','\r\n'),lf.trim().replaceAll('\n','\r\n')].map(hash)};
}).sort((a,b)=>a.name.localeCompare(b.name));}
async function inspect(client){
  const exists=(await client.query("SELECT to_regclass('public._prisma_migrations')::text AS name")).rows[0].name;
  const rows=exists?(await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations WHERE rolled_back_at IS NULL ORDER BY migration_name')).rows:[];
  const all=sources(); const problems=[];
  // Verified original migration from git commit 7b5f1ea2463fa569c356ca1aa1ad993c1879cdd4.
  // Later commits only added idempotence guards. Preserve historical DB checksum; never rewrite it.
  const catchUp=all.find(m=>m.name==='20260806120635_catch_up_changes');
  if(catchUp?.checksum==='02822b957fad74718d16a98ed91dc7b8eb019e3729ce6863179f74c18feff018')
    catchUp.accepted.push('de31ab535d45424d783ff603a19540ba366fa3999499d7bd5631d36300a06179');
  for(const row of rows){const source=all.find(m=>m.name===row.migration_name);if(!source)problems.push('Unknown migration: '+row.migration_name);else if(!row.finished_at)problems.push('Unfinished migration: '+row.migration_name);else if(!source.accepted.includes(row.checksum))problems.push('SQL checksum mismatch: '+row.migration_name);}
  return {all,applied:rows,pending:all.filter(m=>!rows.some(r=>r.migration_name===m.name&&r.finished_at)),problems};
}
async function apply(client){
  if(!(await client.query('SELECT pg_try_advisory_lock(20261106,220000) AS locked')).rows[0].locked)throw new Error('Another migration process is running.');
  try{
    const state=await inspect(client); if(state.problems.length)throw new Error(state.problems.join('; '));
    if(!state.pending.length)return {applied:[],pending:0};
    await client.query(`CREATE TABLE IF NOT EXISTS public._prisma_migrations (
      id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,finished_at TIMESTAMPTZ,migration_name VARCHAR(255) NOT NULL,
      logs TEXT,rolled_back_at TIMESTAMPTZ,started_at TIMESTAMPTZ NOT NULL DEFAULT now(),applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
    const applied=[];
    for(const m of state.pending){
      await client.query('BEGIN');
      try{
        await client.query("SET LOCAL lock_timeout='15s'");
        // Each file is wrapped exactly once, even if it contains its own top-level transaction.
        const sql=m.sql.replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'');
        await client.query(sql);
        await client.query('INSERT INTO public._prisma_migrations (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)',[crypto.randomUUID(),m.checksum,m.name]);
        await client.query('COMMIT');applied.push(m.name);console.log('Applied migration: '+m.name);
      }catch(error){await client.query('ROLLBACK');throw new Error('Migration '+m.name+' failed; transaction rolled back. PostgreSQL code: '+(error.code||'unknown'));}
    }
    return {applied,pending:0};
  }finally{await client.query('SELECT pg_advisory_unlock(20261106,220000)');}
}
module.exports={sources,inspect,apply};
