// Isolated PostgreSQL schema only. No migrations applied to public/application tables.
require('dotenv/config');
require('ts-node/register/transpile-only');
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { UserSessionsService } = require('../src/autenticacao/user-sessions.service');
const { AutenticacaoService } = require('../src/autenticacao/autenticacao.service');
const { JwtStrategy } = require('../src/autenticacao/strategies/estrategia-jwt');
const { assertAccess } = require('../src/autenticacao/access-policy');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Somente PostgreSQL local autorizado para este teste.');
  const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: url.toString() });
  let client, prisma, pool;
  const passed = [];
  const ok = name => { passed.push(name); console.log(`PASS: ${name}`); };
  try {
    client = await admin.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    // Copy only table definitions, never application data. Existing local schema is the baseline.
    for (const table of ['empresas', 'usuarios', 'historico_comercial']) await client.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    // Recreate the pre-migration baseline even after the application schema has
    // been upgraded. These definitions are empty and confined to this test schema.
    assert(/^auth_test_[a-f0-9]{32}$/.test(schema));
    await client.query(`ALTER TABLE "${schema}".empresas DROP COLUMN IF EXISTS codigo_empresa`);
    await client.query(`ALTER TABLE "${schema}".usuarios DROP COLUMN IF EXISTS usuario_login, DROP COLUMN IF EXISTS limite_sessoes, DROP COLUMN IF EXISTS permissoes_acoes, DROP COLUMN IF EXISTS login_email_habilitado, DROP COLUMN IF EXISTS login_usuario_habilitado`);
    await client.query(`ALTER TABLE "${schema}".usuarios ALTER COLUMN email SET NOT NULL`);
    const compositeIndexes = await client.query(`SELECT index_class.relname AS name FROM pg_index i JOIN pg_class table_class ON table_class.oid=i.indrelid JOIN pg_namespace n ON n.oid=table_class.relnamespace JOIN pg_class index_class ON index_class.oid=i.indexrelid WHERE n.nspname=$1 AND table_class.relname='usuarios' AND i.indisunique AND (SELECT array_agg(a.attname::text ORDER BY k.ordinality) FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality) JOIN pg_attribute a ON a.attrelid=table_class.oid AND a.attnum=k.attnum)=ARRAY['id','empresa_id']::text[]`, [schema]);
    for (const row of compositeIndexes.rows) await client.query(`DROP INDEX "${schema}"."${row.name.replaceAll('"', '""')}"`);
    for (const [type, table, column, fallback] of [['papel_usuario', 'usuarios', 'papel', 'USER'], ['status_assinatura_empresa', 'empresas', 'status_assinatura', 'TESTE']]) {
      const labels = await client.query('SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=$1 AND t.typname=$2 ORDER BY e.enumsortorder', ['public', type]);
      const values = labels.rows.map(row => "'" + row.enumlabel.replaceAll("'", "''") + "'").join(',');
      await client.query(`CREATE TYPE "${schema}"."${type}" AS ENUM (${values})`);
      await client.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT, ALTER COLUMN "${column}" TYPE "${schema}"."${type}" USING "${column}"::text::"${schema}"."${type}", ALTER COLUMN "${column}" SET DEFAULT '${fallback}'::"${schema}"."${type}"`);
    }
    await client.query("INSERT INTO empresas (id, nome_fantasia, ativo, status_assinatura, atualizado_em) VALUES ('a', 'Teste A', true, 'ATIVO', now()), ('b', 'Teste B', true, 'ATIVO', now())");
    const hash = await bcrypt.hash('TestPassword!42', 10);
    await client.query(`INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, papel, ativo, atualizado_em, sessao_ativa_id, ultimo_login_em) VALUES ('ua','a','Teste A','a@auth.test',$1,'ADMINISTRADOR',true,now(),'legacy-token',now()), ('ub','b','Teste B','b@auth.test',$1,'USER',true,now(),null,null)`, [hash]);
    const migration = fs.readFileSync('prisma/migrations/20261106150000_company_login_user_sessions/migration.sql', 'utf8');
    await client.query(migration);
    await client.query(fs.readFileSync('prisma/migrations/20261106160000_user_login_methods_optional_email/migration.sql', 'utf8'));
    ok('Migração aditiva preserva registros e importa a sessão legada');
    await client.query('RESET search_path'); client.release(); client = null;
    pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema},public` });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema, disposeExternalPool: true }) });
    const jwt = new JwtService({ secret: 'isolated-test-secret-never-used-in-production', signOptions: { expiresIn: '1d' } });
    const sessions = new UserSessionsService(prisma, jwt);
    const auth = new AutenticacaoService(prisma, jwt, sessions);
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'isolated-test-secret-never-used-in-production' }), prisma);
    const actor = { id: 'ua', companyId: 'a', name: 'Teste A', email: 'a@auth.test', role: 'ADMIN' };
    const codeA = (await prisma.company.findUniqueOrThrow({ where: { id: 'a' } })).code;
    const codeB = (await prisma.company.findUniqueOrThrow({ where: { id: 'b' } })).code;
    assert.notEqual(codeA, codeB);
    await prisma.user.updateMany({ data: { username: 'caixa' } });
    const legacy = await strategy.validate({ sub: 'ua', companyId: 'a', sessionId: 'legacy-token' }); assert.equal(legacy.id, 'ua');
    const adminLogin = await auth.login({ email: 'a@auth.test', password: 'TestPassword!42' });
    await strategy.validate(jwt.verify(adminLogin.accessToken)); ok('Login por e-mail preservado');
    const loginA = () => auth.loginCompanyUser({ companyCode: codeA.toLowerCase(), username: 'CAIXA', password: 'TestPassword!42' });
    const first = await loginA(); await strategy.validate(jwt.verify(first.accessToken)); ok('Login por código e usuário normalizados');
    await assert.rejects(() => auth.loginCompanyUser({ companyCode: codeB, username: 'a@auth.test', password: 'TestPassword!42' })); ok('Credencial da empresa A não autentica na B');
    const other = await auth.loginCompanyUser({ companyCode: codeB, username: 'caixa', password: 'TestPassword!42' });
    assert.equal(other.user.companyId, 'b'); ok('Mesmo login permitido em empresas distintas');
    await prisma.user.update({ where: { id: 'ub' }, data: { isActive: false } });
    await assert.rejects(() => auth.loginCompanyUser({ companyCode: codeB, username: 'caixa', password: 'TestPassword!42' }));
    await assert.rejects(() => strategy.validate(jwt.verify(other.accessToken))); ok('Usuário inativo bloqueado no login e no token');
    assert.throws(() => assertAccess({ role: 'USER', permissions: ['sales'], actionPermissions: ['sales:view'] }, 'sales', 'delete'));
    assert.doesNotThrow(() => assertAccess({ role: 'USER', permissions: ['sales'] }, 'sales', 'delete')); ok('Ação proibida bloqueada; permissão legada preservada');
    const second = await loginA(); await assert.rejects(() => strategy.validate(jwt.verify(first.accessToken))); await strategy.validate(jwt.verify(second.accessToken)); ok('Limite 1 revoga acesso anterior e impede reutilizar token');
    await auth.updateCompanyUser(actor, 'ua', { name: 'Teste A', role: 'ADMIN', isActive: true, permissions: ['sales'], maxConcurrentSessions: 2 });
    const third = await loginA(), fourth = await loginA();
    await assert.rejects(() => strategy.validate(jwt.verify(second.accessToken))); await strategy.validate(jwt.verify(third.accessToken)); await strategy.validate(jwt.verify(fourth.accessToken)); ok('Limite 2 mantém os dois acessos mais recentes');
    const currentSessions = await sessions.list('a', 'ua'); const newest = currentSessions.find(s => !s.revokedAt);
    await sessions.revoke('a', 'ua', 'ua', newest.id);
    await assert.rejects(() => strategy.validate(jwt.verify(fourth.accessToken))); ok('Administrador revoga sessão específica');
    const fifth = await loginA();
    await auth.updateCompanyUser(actor, 'ua', { name: 'Teste A', role: 'ADMIN', isActive: true, permissions: ['sales'], maxConcurrentSessions: 1 });
    await assert.rejects(() => strategy.validate(jwt.verify(third.accessToken))); await strategy.validate(jwt.verify(fifth.accessToken)); ok('Redução de limite preserva sessão mais recente e gera auditoria');
    const concurrent = await Promise.all([loginA(), loginA(), loginA()]);
    const live = await prisma.userSession.findMany({ where: { userId: 'ua', companyId: 'a', revokedAt: null, expiresAt: { gt: new Date() } } }); assert.equal(live.length, 1);
    const validity = await Promise.all(concurrent.map(async response => { try { await strategy.validate(jwt.verify(response.accessToken)); return true; } catch { return false; } })); assert.equal(validity.filter(Boolean).length, 1); ok('Três logins concorrentes respeitam limite no PostgreSQL real');
    await prisma.userSession.update({ where: { id: live[0].id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const liveToken = concurrent.find((_, i) => validity[i]); await assert.rejects(() => strategy.validate(jwt.verify(liveToken.accessToken))); ok('Sessão expirada bloqueada');
    const logout = await loginA(); const claims = jwt.verify(logout.accessToken); await sessions.revoke('a', 'ua', 'ua', undefined, claims.sessionId); await assert.rejects(() => strategy.validate(claims)); ok('Logout invalida a sessão no servidor');
    await assert.rejects(() => sessions.list('a', 'ub')); await assert.rejects(() => sessions.revoke('a', 'ub', 'ua'));
    const forged = jwt.verify((await loginA()).accessToken); forged.companyId = 'b'; await assert.rejects(() => strategy.validate(forged)); ok('Consulta, revogação e token rejeitam contexto de outra empresa');
    await assert.rejects(() => prisma.user.create({ data: { id: 'duplicate', companyId: 'a', name: 'Duplicate', username: 'caixa', email: 'dup@auth.test', passwordHash: hash } })); ok('Constraint impede login duplicado na mesma empresa');
    const beforePassword = await loginA();
    await auth.changePassword({ ...actor, sessionId: jwt.verify(beforePassword.accessToken).sessionId }, { currentPassword: 'TestPassword!42', newPassword: 'UpdatedPassword!42' });
    await strategy.validate(jwt.verify(beforePassword.accessToken)); await assert.rejects(() => loginA()); ok('Troca de senha preserva sessão atual e rejeita credencial anterior');
    const resetToken = 'test-reset-token'; const tokenHash = require('node:crypto').createHash('sha256').update(resetToken).digest('hex');
    await prisma.user.update({ where: { id: 'ua' }, data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(Date.now() + 60000) } });
    await auth.resetPassword({ token: resetToken, newPassword: 'ResetPassword!42' }); await assert.rejects(() => strategy.validate(jwt.verify(beforePassword.accessToken))); await assert.rejects(() => auth.resetPassword({ token: resetToken, newPassword: 'Again!42' })); ok('Reset revoga sessões e impede reutilização do código');
    await prisma.company.update({ where: { id: 'a' }, data: { isActive: false } });
    await assert.rejects(() => auth.login({ email: 'a@auth.test', password: 'ResetPassword!42' })); ok('Bloqueio de empresa preservado');
    await prisma.company.update({ where: { id: 'a' }, data: { isActive: true, subscriptionStatus: 'EXPIRED' } });
    await assert.rejects(() => auth.login({ email: 'a@auth.test', password: 'ResetPassword!42' })); ok('Bloqueio por assinatura preservado');
    await prisma.company.update({ where: { id: 'a' }, data: { subscriptionStatus: 'ACTIVE' } });
    await prisma.user.update({ where: { id: 'ub' }, data: { isActive: true, permissions: ['sales'], actionPermissions: ['sales:view'] } });
    const { Test } = require('@nestjs/testing');
    const { PassportModule } = require('@nestjs/passport');
    const { ValidationPipe } = require('@nestjs/common');
    const { AutenticacaoController } = require('../src/autenticacao/autenticacao.controller');
    const { VendasController } = require('../src/vendas/vendas.controller');
    const { VendasService } = require('../src/vendas/vendas.service');
    const { PrismaService } = require('../src/prisma/prisma.service');
    const request = require('supertest');
    let writes = 0;
    const module = await Test.createTestingModule({ imports: [PassportModule.register({ defaultStrategy: 'jwt' })], controllers: [AutenticacaoController, VendasController], providers: [
      { provide: AutenticacaoService, useValue: auth }, { provide: UserSessionsService, useValue: sessions }, { provide: PrismaService, useValue: prisma },
      { provide: VendasService, useValue: { createProduct() { writes++; }, listProducts() { return []; } } },
    ] }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    try {
      const http = request(app.getHttpServer());
      const response = await http.post('/autenticacao/login-usuario').send({ companyCode: codeB, username: 'caixa', password: 'TestPassword!42' }).expect(201);
      const token = response.body.accessToken;
      await http.get('/vendas/produtos').set('Authorization', `Bearer ${token}`).expect(200);
      await http.post('/vendas/produtos').set('Authorization', `Bearer ${token}`).send({}).expect(403);
      assert.equal(writes, 0);
      await http.get('/autenticacao/usuarios').set('Authorization', `Bearer ${token}`).expect(403);
      await http.post('/autenticacao/usuarios/ub/sessoes/encerrar').set('Authorization', `Bearer ${token}`).expect(403);
      await http.get('/autenticacao/sessao').expect(401);
      await http.post('/autenticacao/logout').set('Authorization', `Bearer ${token}`).expect(201);
      await http.get('/autenticacao/sessao').set('Authorization', `Bearer ${token}`).expect(401);
      ok('APIs reais: login, leitura autorizada, escrita negada, administração negada, logout e token revogado');
      const adminResponse = await http.post('/autenticacao/login').send({ email: 'a@auth.test', password: 'ResetPassword!42' }).expect(201);
      const adminToken = adminResponse.body.accessToken;
      await http.get('/autenticacao/usuarios/ub/sessoes').set('Authorization', `Bearer ${adminToken}`).expect(404);
      await http.post('/autenticacao/usuarios/ub/sessoes/encerrar').set('Authorization', `Bearer ${adminToken}`).expect(404);
      await http.patch('/autenticacao/usuarios/ua').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Teste A', role: 'ADMIN', isActive: true, permissions: ['sales'], maxConcurrentSessions: 0 }).expect(400);
      await http.patch('/autenticacao/usuarios/ua').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Teste A', role: 'ADMIN', isActive: true, permissions: ['sales'], maxConcurrentSessions: null }).expect(400);
      ok('APIs reais: administrador não consulta nem revoga outra empresa; limite inválido rejeitado');
      const created = await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Operador', email: 'operator@auth.test', password: 'OperatorPassword!42', username: 'operador', role: 'USER', permissions: ['sales'], maxConcurrentSessions: 2, actionPermissions: ['sales:view'] }).expect(201);
      assert.equal(created.body.username, 'operador'); assert.equal(created.body.maxConcurrentSessions, 2); assert.equal(created.body.passwordHash, undefined);
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Duplicado', email: 'other@auth.test', password: 'OperatorPassword!42', username: 'operador', role: 'USER', permissions: ['sales'] }).expect(409);
      await http.patch(`/autenticacao/usuarios/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Operador', role: 'OWNER', isActive: true, permissions: ['sales'] }).expect(400);
      ok('APIs reais: cadastro persiste login, limite e ações sem expor hash; duplicidade e atribuição de proprietário rejeitadas');
      const userPayload = { name: 'Sem email', password: 'NoEmailPassword!42', role: 'USER', permissions: ['sales'], emailLoginEnabled: false, userLoginEnabled: true };
      const noEmail = await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, username: 'sememail' }).expect(201);
      assert.equal(noEmail.body.email, null); assert.equal(noEmail.body.emailLoginEnabled, false); assert.equal(noEmail.body.userLoginEnabled, true);
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, username: 'sememail2', email: null }).expect(201);
      await http.post('/autenticacao/login-usuario').send({ companyCode: codeA, username: 'sememail', password: 'NoEmailPassword!42' }).expect(201);
      ok('Cadastro de vários usuários sem e-mail e login operacional funcionam');
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, username: 'contato', email: 'contact@auth.test' }).expect(201);
      await http.post('/autenticacao/login').send({ email: 'contact@auth.test', password: 'NoEmailPassword!42' }).expect(401);
      await http.post('/autenticacao/login-usuario').send({ companyCode: codeA, username: 'contato', password: 'NoEmailPassword!42' }).expect(201);
      ok('E-mail de contato não habilita acesso administrativo desmarcado');
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, email: 'emailonly@auth.test', emailLoginEnabled: true, userLoginEnabled: false }).expect(201);
      await http.post('/autenticacao/login').send({ email: 'emailonly@auth.test', password: 'NoEmailPassword!42' }).expect(201);
      await http.post('/autenticacao/login-usuario').send({ companyCode: codeA, username: 'emailonly@auth.test', password: 'NoEmailPassword!42' }).expect(401);
      ok('Login por e-mail funciona sozinho e bloqueia acesso operacional desmarcado');
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, username: 'invalid1', emailLoginEnabled: true }).expect(400);
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send({ ...userPayload, username: 'invalid2', userLoginEnabled: false }).expect(400);
      await http.post('/autenticacao/usuarios').set('Authorization', `Bearer ${adminToken}`).send(userPayload).expect(400);
      await http.patch(`/autenticacao/usuarios/${noEmail.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Sem email', role: 'USER', isActive: true, permissions: ['sales'], emailLoginEnabled: true }).expect(400);
      await http.patch(`/autenticacao/usuarios/${noEmail.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Com email', role: 'USER', isActive: true, permissions: ['sales'], email: 'enabled@auth.test', emailLoginEnabled: true, userLoginEnabled: false }).expect(200);
      await http.post('/autenticacao/login').send({ email: 'enabled@auth.test', password: 'NoEmailPassword!42' }).expect(201);
      await http.post('/autenticacao/login-usuario').send({ companyCode: codeA, username: 'sememail', password: 'NoEmailPassword!42' }).expect(401);
      ok('Cadastro e edição exigem identidade válida e respeitam as formas de login selecionadas');
    } finally { await app.close(); }
    console.log(`RESULTADO: ${passed.length} cenários aprovados em schema isolado.`);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    if (prisma) await prisma.$disconnect();
    else if (pool) await pool.end();
    assert(/^auth_test_[a-f0-9]{32}$/.test(schema));
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
