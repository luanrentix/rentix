const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const payables = await prisma.contaPagar.findMany({ take: 1, include: { payments: true } });
    console.log('ContaPagar OK', payables.length);
    const receivables = await prisma.contaReceber.findMany({ take: 1, include: { payments: true } });
    console.log('ContaReceber OK', receivables.length);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
