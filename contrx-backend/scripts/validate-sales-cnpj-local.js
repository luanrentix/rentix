require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { VendasService } = require('../dist/src/vendas/vendas.service');

async function main() {
  const database = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) throw new Error('Validação permitida somente com banco local.');
  const prisma = new PrismaService();
  const originalFetch = globalThis.fetch;
  const providers = [];
  globalThis.fetch = async (...args) => {
    const provider = new URL(String(args[0])).hostname;
    try {
      const response = await originalFetch(...args);
      providers.push({ provider, status: response.status });
      return response;
    } catch (error) {
      providers.push({ provider, error: error.cause?.code || error.name });
      throw error;
    }
  };
  try {
    const settings = await prisma.appSettings.findFirst({ where: { companySettings: { path: ['ramoAtividade'], equals: 'CONFECCOES' } }, select: { companyId: true } });
    if (!settings) throw new Error('Empresa local de confecções não encontrada.');
    const data = await new VendasService(prisma).lookupCompanyByCnpj(settings.companyId, process.argv[2] || '');
    console.log(JSON.stringify({ success: true, nameFilled: Boolean(data.name), addressFilled: Boolean(data.address), providers }));
  } catch (error) {
    console.log(JSON.stringify({ success: false, message: error.message, providers }));
    process.exitCode = 1;
  } finally { globalThis.fetch = originalFetch; await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
