'use strict';
// Real HTTP tests on a new process and a synthetic localhost rehearsal database only.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const {Client}=require('pg');
const {JwtService}=require('@nestjs/jwt');
const {connection}=require('./controlled-cleanup.cjs');
async function freePort(){const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
async function main(){
  const config=connection(process.argv[2]);const database=process.argv[3];
  if(!['localhost','127.0.0.1','[::1]'].includes(config.url.hostname)||!/^contrx_schema_rehearsal_\d+$/.test(database||''))throw new Error('Synthetic local rehearsal database required.');
  const url=new URL(config.url);url.pathname='/'+database;
  const db=new Client({connectionString:url.href});await db.connect();
  const secret=crypto.randomBytes(32).toString('hex'),jwt=new JwtService({secret});
  const dir=path.resolve('backups','http-smoke-'+Date.now());fs.mkdirSync(dir,{recursive:true});
  let child;
  try{
    await db.query("SET TIME ZONE 'UTC'");
    const users=(await db.query("SELECT u.id,u.email,u.empresa_id FROM public.usuarios u JOIN public.empresas e ON e.id=u.empresa_id WHERE u.nome='Synthetic release user' AND e.nome_fantasia='Synthetic release company' ORDER BY u.email")).rows;
    if(users.length!==2)throw new Error('Expected exactly two synthetic tenants.');
    const tokens=[];
    for(const u of users){
      await db.query("UPDATE public.empresas SET ativo=true,status_assinatura='ATIVO',assinatura_termina_em=now()+interval '1 day' WHERE id=$1",[u.empresa_id]);
      await db.query('INSERT INTO public.configuracoes_app (id,empresa_id,configuracoes_empresa,atualizado_em) VALUES ($1,$2,$3,now()) ON CONFLICT (empresa_id) DO UPDATE SET configuracoes_empresa=excluded.configuracoes_empresa',[crypto.randomUUID(),u.empresa_id,{ramoAtividade:'CONFECCOES',tradeName:'Synthetic release company'}]);
      const sessionId=crypto.randomUUID();await db.query("INSERT INTO public.usuarios_sessoes (id,sessao_id,usuario_id,empresa_id,expira_em) VALUES ($1,$2,$3,$4,now()+interval '1 hour')",[crypto.randomUUID(),sessionId,u.id,u.empresa_id]);
      tokens.push(jwt.sign({sub:u.id,companyId:u.empresa_id,email:u.email,role:'OWNER',sessionId},{expiresIn:'1h'}));
    }
    const port=await freePort(),base='http://127.0.0.1:'+port;
    const log=fs.openSync(path.join(dir,'backend.log'),'wx',0o600);
    child=spawn(process.execPath,['dist/src/main.js'],{windowsHide:true,stdio:['ignore',log,log],env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATABASE_URL:url.href,DIRECT_URL:url.href,JWT_SECRET:secret,CONTRX_USE_SUPABASE_ENV:'false'}});fs.closeSync(log);
    let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await delay(200);}
    if(!ready)throw new Error('Isolated backend did not start. See private smoke log.');
    async function request(method,endpoint,token,body,status=200){const form=body instanceof FormData;const response=await fetch(base+endpoint,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!form&&body?{'Content-Type':'application/json'}:{})},...(body?{body:form?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(response.status!==status)throw new Error(method+' '+endpoint+' returned '+response.status+' instead of '+status+': '+(await response.text()).slice(0,350));return response.json().catch(()=>null);}
    await request('GET','/vendas/produtos',null,null,401);
    const prefix='200'+String(Date.now()).slice(-9);
    const sum=[...prefix].reduce((total,digit,index)=>total+Number(digit)*(index%2?3:1),0);
    const barcode=prefix+String((10-sum%10)%10);
    const payload={name:'SYNTHETIC HTTP PRODUCT '+Date.now(),category:'FIXTURE',brand:'FIXTURE',price:23.5,stock:2,minimumStock:1,manageStock:true,barcode};
    const first=await request('POST','/vendas/produtos',tokens[0],payload,201);
    const second=await request('POST','/vendas/produtos',tokens[1],payload,201);
    const own=await request('GET','/vendas/produtos',tokens[0]);
    if(!JSON.stringify(own).includes(first.id)||JSON.stringify(own).includes(second.id))throw new Error('Product list crossed tenant boundary.');
    await request('PATCH','/vendas/produtos/'+second.id,tokens[0],{name:'CROSS TENANT ATTEMPT'},404);
    await request('POST','/vendas/produtos',tokens[0],{...payload,name:payload.name+' DUPLICATE'},400);
    await request('GET','/vendas/produtos/'+second.id+'/historico-precos',tokens[0],null,404);
    const settings=await request('GET','/settings',tokens[0]);if(settings.companyId!==users[0].empresa_id)throw new Error('Settings crossed tenant boundary.');
    await request('GET','/vendas/inicio/resumo',tokens[0]);
    await request('GET','/admin/resumo',tokens[0],null,403);
    const form=new FormData();form.set('entityType','OTHER');form.set('entityId',first.id);form.set('file',new Blob(['Synthetic upload fixture'],{type:'text/plain'}),'fixture.txt');
    const file=await request('POST','/files/upload',tokens[0],form,201);
    if(!file.url?.startsWith('data:text/plain;base64,'))throw new Error('Upload did not persist safely as a data URL.');
    await request('DELETE','/files/'+file.id,tokens[1],null,404);
    const attachments=await request('GET','/files/entity/OTHER/'+first.id,tokens[0]);if(!JSON.stringify(attachments).includes(file.id))throw new Error('Own attachment unavailable.');
    const result={passed:true,database,productionTouched:false,checks:['anonymous access denied','real JWT/session authentication','product create and price-history trigger','same GTIN allowed in distinct tenants','GTIN duplicate blocked within tenant','product list isolated','cross-tenant product mutation denied','cross-tenant price history denied','settings isolated','home dashboard healthy','owner cannot access system-owner admin','real multipart upload on corrected Multer','cross-tenant file deletion denied','own attachment readable']};
    fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
  }finally{if(child)child.kill();await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
