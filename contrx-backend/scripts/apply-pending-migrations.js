require('dotenv/config');
const {Client}=require('pg');
const {databaseConnectionOptions}=require('./lib/database-connection.cjs');
const {inspect,apply}=require('./lib/migration-runner.cjs');
async function main(){
  const client=new Client(databaseConnectionOptions(process.env.DIRECT_URL||process.env.DATABASE_URL));
  await client.connect();
  try{
    if(process.argv.includes('--check')){
      await client.query('BEGIN READ ONLY');const state=await inspect(client);await client.query('ROLLBACK');
      console.log(JSON.stringify({pending:state.pending.map(m=>m.name),problems:state.problems}));
      if(state.problems.length)process.exitCode=1;
    }else console.log(JSON.stringify(await apply(client)));
  }finally{await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
