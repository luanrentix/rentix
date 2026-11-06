'use strict';
const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('dotenv');
const {Client}=require('pg');
const {databaseConnectionOptions}=require('./lib/database-connection.cjs');
const {inspect,apply}=require('./lib/migration-runner.cjs');
const {createBackup,tool}=require('./lib/release-backup.cjs');
async function main(){
  const args=process.argv.slice(2),pos=args.indexOf('--env');
  if(pos<0||!args[pos+1])throw new Error('Explicit --env is required.');
  const env=dotenv.parse(fs.readFileSync(path.resolve(args[pos+1])));
  const raw=env.DIRECT_URL||env.DATABASE_URL;
  const config=databaseConnectionOptions(raw,env);const url=new URL(config.connectionString);
  if(url.port==='6543')throw new Error('Use DIRECT_URL or a session pooler on port 5432 for migrations, not transaction pooling.');
  const client=new Client(config);await client.connect();
  try{
    await client.query('BEGIN READ ONLY');const state=await inspect(client);await client.query('ROLLBACK');
    console.log(JSON.stringify({target:url.hostname+url.pathname,pending:state.pending.map(m=>m.name),problems:state.problems}));
    if(state.problems.length)throw new Error('Migration history failed verification.');
    if(args.includes('--require-current')&&state.pending.length)throw new Error('Update Supabase with menu option 2 before deployment.');
    if(!args.includes('--apply'))return;
    if(!args.includes('--confirm-backup-e-migrar'))throw new Error('Manual confirmation required for exporting real application data and applying migrations.');
    if(!state.pending.length){console.log('Database already current. No backup or writes required.');return;}
    const file=path.resolve(__dirname,'../backups','pre-release-'+Date.now()+'.dump');
    const manifest=await createBackup(raw,file);
    tool('pg_restore',['--list',file],url);
    console.log(JSON.stringify({backup:file,sha256:manifest.sha256,scope:manifest.scope,archiveVerified:true,actualDataRestoreTest:false}));
    console.log(JSON.stringify(await apply(client)));
  }finally{await client.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
