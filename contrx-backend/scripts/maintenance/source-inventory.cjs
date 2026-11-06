'use strict';
// Static evidence inventory. Findings require contextual review, never an automatic proof of IDOR.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=> e.isDirectory()?files(path.join(dir,e.name)): /\.(ts|tsx)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
const queries=[],routes=[],signals=[];
function decorators(n){return ts.canHaveDecorators(n)?ts.getDecorators(n)||[]:[];}
for(const file of [...files(path.join(root,'contrx-backend/src')),...['app','components','context','services'].flatMap(d=>files(path.join(root,d)))]) {
  if(file.endsWith('.spec.ts'))continue;
  const source=fs.readFileSync(file,'utf8'); const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const relative=path.relative(root,file).replaceAll('\\','/');
  const line=n=>ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1;
  function visit(n){
    if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)) {
      const method=n.expression.name.text;
      if(['findMany','findFirst','findUnique','update','updateMany','delete','deleteMany','count','aggregate','groupBy','upsert','$queryRawUnsafe','$executeRawUnsafe'].includes(method)) {
        queries.push({file:relative,line:line(n),callee:n.expression.getText(ast),companyScopeInCall:/companyId|empresa_id/.test(n.getText(ast)),reviewRequired:true});
      }
    }
    if(ts.isClassDeclaration(n)) {
      const classDecorators=decorators(n).map(d=>d.expression.getText(ast));
      if(classDecorators.some(d=>d.startsWith('Controller('))) for(const m of n.members) {
        const ds=decorators(m).map(d=>d.expression.getText(ast));
        for(const route of ds.filter(d=>/^(Get|Post|Put|Patch|Delete)\(/.test(d))) routes.push({file:relative,line:line(m),controller:classDecorators.find(d=>d.startsWith('Controller(')),route,guards:[...classDecorators,...ds].filter(d=>d.startsWith('UseGuards(')),permissions:ds.filter(d=>/ToolPermission|Require/.test(d))});
      }
    }
    ts.forEachChild(n,visit);
  }
  visit(ast);
  source.split(/\r?\n/).forEach((text,i)=>{for(const signal of ['dangerouslySetInnerHTML','localStorage','sessionStorage','NEXT_PUBLIC_','service_role','private_key','$queryRawUnsafe','$executeRawUnsafe']) if(text.includes(signal))signals.push({file:relative,line:i+1,signal});});
}
const migrations=fs.readdirSync(path.join(root,'contrx-backend/prisma/migrations'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>{const sql=fs.readFileSync(path.join(root,'contrx-backend/prisma/migrations',e.name,'migration.sql'),'utf8');return {name:e.name,checksum:crypto.createHash('sha256').update(sql).digest('hex')};});
const output=process.argv[2];if(!output)throw new Error('Output file required.');
fs.writeFileSync(output,JSON.stringify({queries,routes,signals,migrations,limitations:'Static inventory is not proof of reachability or runtime isolation. Scoped preliminary lookups, global system-owner operations, and public signed links require contextual review.'},null,2),{flag:'wx',mode:0o600});
console.log(JSON.stringify({queries:queries.length,routes:routes.length,signals:signals.length,migrations:migrations.length,output}));
