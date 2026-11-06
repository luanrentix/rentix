require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { VendasService } = require('../dist/src/vendas/vendas.service');

async function main() {
  const database = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) throw new Error('Somente banco local.');
  const prisma = new PrismaService();
  try {
    const settings = await prisma.appSettings.findMany({ where: { companySettings: { path: ['ramoAtividade'], equals: 'CONFECCOES' } }, select: { companyId: true } });
    if (!settings.length) throw new Error('Empresa local de confecções não encontrada.');
    const service = new VendasService(prisma);
    for (const { companyId } of settings) {
      await service.listCustomers(companyId);
      const customers = await service.listCustomers(companyId);
      for (const [systemKey, name] of [['CONSUMIDOR_FINAL', 'CONSUMIDOR FINAL'], ['CLIENTE_CARTAO', 'CLIENTE CARTÃO']]) {
        const matches = customers.filter((item) => item.systemKey === systemKey);
        if (matches.length !== 1 || !matches[0].isSystem || matches[0].name !== name) throw new Error('Cadastro protegido inválido.');
        for (const action of [() => service.updateCustomer(companyId, matches[0].id, { name: 'ALTERADO' }), () => service.archiveCustomer(companyId, matches[0].id)]) {
          try { await action(); throw new Error('Alteração indevida permitida.'); }
          catch (error) { if (error.getStatus?.() !== 403) throw error; }
        }
      }
    }
    console.log(JSON.stringify({ success: true, companies: settings.length, protectedCustomers: true, idempotent: true }));
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
