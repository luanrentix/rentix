'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plan } = require('./controlled-cleanup.cjs');
function fixture() {
  const rows = {
    empresas: [{id:'safe',nome_fantasia:'Preservada'}, {id:'remove',nome_fantasia:'Teste'}, {id:'uncertain'}],
    usuarios: [
      {id:'a', email:'adm@contrx.com', empresa_id:'safe', ativo:true},
      {id:'b', email:'luanathmra@gmail.com', empresa_id:'safe', ativo:true},
      {id:'c', email:'test@example.invalid', empresa_id:'remove', ativo:true},
    ],
    pessoas: [{id:'p',empresa_id:'remove'}, {id:'q',empresa_id:'safe'}],
    usuarios_sessoes: [{id:'s',usuario_id:'c',empresa_id:'remove'}],
  };
  const constraints = Object.keys(rows).map(child=>({schema:'public',child,type:'p',columns:['id']}));
  for (const child of ['usuarios','pessoas','usuarios_sessoes']) constraints.push({schema:'public',child,type:'f',columns:['empresa_id'],parent_schema:'public',parent:'empresas',parent_columns:['id']});
  constraints.push({schema:'public',child:'usuarios_sessoes',type:'f',columns:['usuario_id','empresa_id'],parent_schema:'public',parent:'usuarios',parent_columns:['id','empresa_id']});
  return {rows,catalog:{constraints}};
}
test('protects both identities even in one company; preserves orphan companies and shared company data',()=>{
  const {rows,catalog}=fixture(); const p=plan(catalog,rows);
  assert.deepEqual(p.blockers,[]); assert.deepEqual(p.protectedCompanies,['safe']);
  assert.deepEqual(p.orphanCompaniesPreserved,['uncertain']);
  assert.ok(!p.order.includes('usuarios:a')); assert.ok(!p.order.includes('pessoas:q'));
  assert.ok(p.order.indexOf('usuarios_sessoes:s')<p.order.indexOf('usuarios:c'));
  assert.ok(p.order.indexOf('usuarios:c')<p.order.indexOf('empresas:remove'));
});
test('missing, duplicate, inactive protected identity block deletion',()=>{
  for (const kind of ['missing','duplicate','inactive']) {
    const {rows,catalog}=fixture();
    if(kind==='missing') rows.usuarios.shift();
    if(kind==='duplicate') rows.usuarios.push({...rows.usuarios[0],id:'dup',email:' ADM@CONTRX.COM '});
    if(kind==='inactive') rows.usuarios[0].ativo=false;
    assert.ok(plan(catalog,rows).blockers.some(b=>b.includes('Protected identity')));
  }
});
test('retained references to candidate users block even SET NULL/cascade and soft actors',()=>{
  const {rows,catalog}=fixture(); rows.pessoas[1].usuario_id='c';
  const p=plan(catalog,rows); assert.ok(p.blockers.some(b=>b.includes('Shared reference')));
});
test('unknown populated table or primary key blocks automatically',()=>{
  const {rows,catalog}=fixture(); rows.new_table=[{id:'unknown',empresa_id:'remove'}];
  assert.ok(plan(catalog,rows).blockers.some(b=>b.includes('Unknown table')));
});
test('row graph handles self referencing grades child before parent',()=>{
  const {rows,catalog}=fixture(); rows.vendas_produtos=[{id:'parent',empresa_id:'remove',produto_grade_id:null},{id:'child',empresa_id:'remove',produto_grade_id:'parent'}];
  catalog.constraints.push({schema:'public',child:'vendas_produtos',type:'p',columns:['id']},{schema:'public',child:'vendas_produtos',type:'f',columns:['produto_grade_id'],parent_schema:'public',parent:'vendas_produtos',parent_columns:['id']});
  const p=plan(catalog,rows); assert.deepEqual(p.blockers,[]);
  assert.ok(p.order.indexOf('vendas_produtos:child')<p.order.indexOf('vendas_produtos:parent'));
});
test('cycles, orphans, cross-schema dependencies block execution',()=>{
  const {rows,catalog}=fixture();
  catalog.constraints.push({schema:'auth',child:'users',type:'f',parent_schema:'public',parent:'usuarios'});
  rows.usuarios_sessoes[0].usuario_id='missing';
  const p=plan(catalog,rows); assert.ok(p.blockers.some(b=>b.includes('Cross-schema'))); assert.ok(p.blockers.some(b=>b.includes('Orphan')));
});
test('external files and protected email inside candidate row block deletion',()=>{
  const {rows,catalog}=fixture(); rows.arquivos_sistema=[{id:'f',empresa_id:'remove',url:'/uploads/legacy.pdf'}];
  catalog.constraints.push({schema:'public',child:'arquivos_sistema',type:'p',columns:['id']});
  rows.pessoas[0].__mentions_protected_email=true;
  const p=plan(catalog,rows); assert.ok(p.blockers.some(b=>b.includes('External/legacy'))); assert.ok(p.blockers.some(b=>b.includes('Protected identity/email/company')));
});
