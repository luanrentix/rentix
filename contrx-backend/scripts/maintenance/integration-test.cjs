'use strict';
// Creates dedicated localhost databases. Never writes to the source application database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { connection, report } = require('./controlled-cleanup.cjs');
const qi = s => '"' + s.replaceAll('"','""') + '"';
async function main() {
  const source = connection(process.argv[2] || '.env');
  if (!['localhost','127.0.0.1','[::1]'].includes(source.url.hostname)) throw new Error('Tests require a localhost source.');
  const stamp = Date.now();
  const testName = `contrx_cleanup_test_${stamp}`;
  const restoreName = `contrx_cleanup_restore_${stamp}`;
  const dir = path.resolve('backups', `cleanup-isolated-${stamp}`);
  fs.mkdirSync(dir, {recursive:true});
  const admin = new Client({connectionString:source.connectionString}); await admin.connect();
  try { for (const name of [testName,restoreName]) await admin.query(`CREATE DATABASE ${qi(name)}`); }
  finally { await admin.end(); }
  const testUrl = new URL(source.url); testUrl.pathname = '/' + testName;
  const restoreUrl = new URL(source.url); restoreUrl.pathname = '/' + restoreName;
  const testEnv = path.join(dir,'isolated.env'); const restoreEnv = path.join(dir,'restore.env');
  fs.writeFileSync(testEnv, `DATABASE_URL=${testUrl.href}\n`, {mode:0o600});
  fs.writeFileSync(restoreEnv, `DATABASE_URL=${restoreUrl.href}\n`, {mode:0o600});
  const tool = name => process.env.PG_BIN ? path.join(process.env.PG_BIN, name + (process.platform==='win32'?'.exe':'')) : name;
  const pgArgs = u => ['--host',u.hostname,'--port',u.port||'5432','--username',decodeURIComponent(u.username),'--dbname',decodeURIComponent(u.pathname.slice(1)),'--no-password'];
  const pgEnv = {...process.env,PGPASSWORD:decodeURIComponent(source.url.password)};
  function run(binary,args,env=process.env) {
    const r=spawnSync(binary,args,{env,windowsHide:true,encoding:'utf8',timeout:600000,maxBuffer:8*1024*1024});
    if(r.error||r.status!==0) throw new Error(`${path.basename(binary)} failed during isolated test: ${r.stderr || r.stdout}`);
    return r;
  }
  const schema = path.join(dir,'schema.dump');
  run(tool('pg_dump'),['--schema-only','--format=custom','--file',schema,...pgArgs(source.url)],pgEnv);
  run(tool('pg_restore'),['--exit-on-error','--no-owner','--no-privileges',schema,...pgArgs(testUrl)],pgEnv);
  const db = new Client({connectionString:testUrl.href}); await db.connect();
  let testReport;
  try {
    const company=crypto.randomUUID(), unwantedCompany=crypto.randomUUID();
    const adminId=crypto.randomUUID(), luan=crypto.randomUUID(), unwanted=crypto.randomUUID();
    const bcrypt=require('bcrypt'); const passwordHash=await bcrypt.hash('IsolatedFixtureOnly!7',10);
    for (const [id,name] of [[company,'Protected isolated fixture'],[unwantedCompany,'Disposable isolated fixture']]) {
      await db.query('INSERT INTO public.empresas (id,nome_fantasia,atualizado_em) VALUES ($1,$2,now())',[id,name]);
    }
    for (const [id,email,c] of [[adminId,'adm@contrx.com',company],[luan,'luanathmra@gmail.com',company],[unwanted,'remove@example.invalid',unwantedCompany]]) {
      await db.query('INSERT INTO public.usuarios (id,empresa_id,nome,email,senha_hash,papel,atualizado_em) VALUES ($1,$2,$3,$3,$4,$5,now())',[id,c,email,passwordHash,'PROPRIETARIO']);
    }
    await db.query('INSERT INTO public.usuarios_sessoes (id,sessao_id,usuario_id,empresa_id,expira_em) VALUES ($1,$2,$3,$4,now()+interval \'1 day\')',[crypto.randomUUID(),crypto.randomUUID(),unwanted,unwantedCompany]);
    await db.query('INSERT INTO public.pessoas (id,empresa_id,tipo,nome,documento,atualizado_em) VALUES ($1,$2,$3,$4,$5,now())',[crypto.randomUUID(),unwantedCompany,'PESSOA_FISICA','Disposable person','00000000000']);
    const dryFile=path.join(dir,'dry-run.json');
    run(process.execPath,['scripts/maintenance/dry-run.cjs','--env',testEnv,'--out',dryFile]);
    const dry=JSON.parse(fs.readFileSync(dryFile,'utf8')); assert.deepEqual(dry.blockers,[]);
    assert.equal(dry.totalUsers,3); assert.equal(dry.candidateUsers.length,1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,3);
    // Missing approval cannot delete or generate an execution backup.
    const denied=spawnSync(process.execPath,['scripts/maintenance/execute.cjs','--env',testEnv,'--out',path.join(dir,'denied.json')],{encoding:'utf8',windowsHide:true});
    assert.equal(denied.status,1); assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,3);
    // Advisory lock must reject a second maintenance session before any mutation.
    await db.query('SELECT pg_advisory_lock(20261106,7711)');
    const concurrent=spawnSync(process.execPath,['scripts/maintenance/dry-run.cjs','--env',testEnv,'--out',path.join(dir,'concurrent.json')],{encoding:'utf8',windowsHide:true});
    assert.equal(concurrent.status,1); await db.query('SELECT pg_advisory_unlock(20261106,7711)');
    const approval=path.join(dir,'approval.json');
    fs.writeFileSync(approval,JSON.stringify({planHash:dry.planHash,targetId:dry.targetId,operator:'automated-isolated-fixture',environment:'isolated',legalRetentionReviewed:true,triggersReviewed:true,externalRecoveryReviewed:true,maintenanceWindowActive:true}));
    // Force an unplanned trigger effect; executor must restore-test backup and roll back everything.
    await db.query(`CREATE FUNCTION public.cleanup_fixture_side_effect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE public.usuarios SET nome='unexpected' WHERE id='${adminId}'; RETURN OLD; END $$`);
    await db.query('CREATE TRIGGER cleanup_fixture_side_effect BEFORE DELETE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.cleanup_fixture_side_effect()');
    const stale=spawnSync(process.execPath,['scripts/maintenance/execute.cjs','--env',testEnv,'--plan',dryFile,'--approval',approval,'--confirm',`LIMPAR BASE ISOLADA ${dry.planHash}`,'--restore-env',restoreEnv,'--out',path.join(dir,'stale.json')],{encoding:'utf8',windowsHide:true});
    assert.equal(stale.status,1); assert.ok(stale.stderr.includes('stale or mismatched'));
    const harmfulDry=path.join(dir,'harmful-dry-run.json');
    run(process.execPath,['scripts/maintenance/dry-run.cjs','--env',testEnv,'--out',harmfulDry]);
    const harmful=JSON.parse(fs.readFileSync(harmfulDry,'utf8'));
    const harmfulApproval=path.join(dir,'harmful-approval.json');
    fs.writeFileSync(harmfulApproval,JSON.stringify({...JSON.parse(fs.readFileSync(approval,'utf8')),planHash:harmful.planHash}));
    const harmfulExecution=spawnSync(process.execPath,['scripts/maintenance/execute.cjs','--env',testEnv,'--plan',harmfulDry,'--approval',harmfulApproval,'--confirm',`LIMPAR BASE ISOLADA ${harmful.planHash}`,'--restore-env',restoreEnv,'--out',path.join(dir,'harmful-execution.json')],{encoding:'utf8',windowsHide:true,timeout:600000});
    assert.equal(harmfulExecution.status,1); assert.ok(harmfulExecution.stderr.includes('Preserved data changed'));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,3);
    assert.equal((await db.query('SELECT nome FROM usuarios WHERE id=$1',[adminId])).rows[0].nome,'adm@contrx.com');
    // The failed transaction's restored backup is retained. Use another empty isolated restore target.
    const nextRestore=restoreName+'_success';
    await db.query(`CREATE DATABASE ${qi(nextRestore)}`); restoreUrl.pathname='/'+nextRestore;
    fs.writeFileSync(restoreEnv,`DATABASE_URL=${restoreUrl.href}\n`,{mode:0o600});
    // Remove only a synthetic trigger/function in the isolated fixture (no application tables removed).
    await db.query('DROP TRIGGER cleanup_fixture_side_effect ON public.usuarios');
    await db.query('DROP FUNCTION public.cleanup_fixture_side_effect()');
    const execution=path.join(dir,'execution.json');
    run(process.execPath,['scripts/maintenance/execute.cjs','--env',testEnv,'--plan',dryFile,'--approval',approval,'--confirm',`LIMPAR BASE ISOLADA ${dry.planHash}`,'--restore-env',restoreEnv,'--out',execution]);
    const final=JSON.parse(fs.readFileSync(execution,'utf8')); assert.equal(final.committed,true); assert.equal(final.backup.restoreTestPassed,true);
    const remaining=(await db.query('SELECT id,email,senha_hash,nome,ativo FROM usuarios ORDER BY email')).rows;
    assert.equal(remaining.length,2); assert.ok(remaining.every(u=>u.senha_hash===passwordHash&&u.ativo));
    assert.ok(await bcrypt.compare('IsolatedFixtureOnly!7',remaining[0].senha_hash));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM empresas')).rows[0].n,1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios_sessoes')).rows[0].n,0);
    const repeat=path.join(dir,'repeat.json'); run(process.execPath,['scripts/maintenance/dry-run.cjs','--env',testEnv,'--out',repeat]);
    assert.equal(JSON.parse(fs.readFileSync(repeat,'utf8')).order.length,0);
    testReport={passed:true,testDatabase:testName,restoreDatabase:restoreName,sourceDatabaseUnchanged:true,productionTouched:false,checks:['actual application schema cloned','read-only dry-run','missing approval rejected','concurrency rejected','schema drift rejected','unexpected trigger changes detected and transaction fully rolled back','full backup restored with matching table fingerprints','ordered cleanup committed only in isolated fixture','protected credentials active and bcrypt verified','repeat plan empty'],dryRun:dryFile,execution};
    fs.writeFileSync(path.join(dir,'test-result.json'),JSON.stringify(testReport,null,2));
    console.log(JSON.stringify(testReport));
  } finally {await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
