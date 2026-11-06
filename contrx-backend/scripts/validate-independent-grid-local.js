// Validação local: todos os registros e movimentos são revertidos ao final.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { VendasService } = require('../dist/src/vendas/vendas.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'Somente banco local');
  const prisma = new PrismaService();
  const rollback = new Error('ROLLBACK_VALIDACAO_GRADE');
  let approved = false;
  try {
    await prisma.$transaction(async (tx) => {
      const settings = await tx.appSettings.findFirst({ where: { companySettings: { path: ['ramoAtividade'], equals: 'CONFECCOES' } }, select: { companyId: true } });
      assert.ok(settings, 'Empresa local de confecções necessária');
      const companyId = settings.companyId;
      const scoped = new Proxy(prisma, { get(target, key) { if (key === '$transaction') return (work) => work(tx); return tx[key] ?? target[key]; } });
      const service = new VendasService(scoped);
      const grid = await tx.salesProductGrid.create({ data: { companyId, name: `VALIDACAO-${randomUUID()}`, values: 'P, M' } });
      const parent = await service.createProduct(companyId, { name: 'VALIDACAO PIJAMA', category: 'VALIDACAO', brand: 'VALIDACAO', price: 100, stock: 8, gridId: grid.id, variants: [{ name: 'P', stock: 3 }, { name: 'M', stock: 5 }] });
      const children = await tx.salesProduct.findMany({ where: { companyId, parentProductId: parent.id }, orderBy: { gridValue: 'asc' } });
      assert.equal(children.length, 2);
      assert.equal(new Set(children.map((child) => child.sku)).size, 2);
      assert.equal((await tx.salesProduct.findUnique({ where: { id: parent.id } })).stock.toNumber(), 0);
      assert.equal(parent.stock.toNumber(), 8);
      assert.ok(children.every((child) => child.gridId === grid.id && child.manageStock));
      const child = children.find((item) => item.gridValue === 'P');
      await service.updateProduct(companyId, child.id, { expectedUpdatedAt: child.updatedAt.toISOString(), name: child.name, category: child.category, brand: child.brand, stock: 4, price: 120, gridId: grid.id });
      const loaded = (await service.listProducts(companyId)).find((item) => item.id === parent.id);
      assert.equal(loaded.stock.toNumber(), 9);
      await assert.rejects(service.updateProduct(companyId, parent.id, { expectedUpdatedAt: loaded.updatedAt.toISOString(), category: parent.category, brand: parent.brand, variants: parent.variants.map((item) => ({ ...item, stock: item.stock.toNumber(), price: item.price.toNumber() })) }), /foi atualizado/);
      const customer = await tx.salesCustomer.create({ data: { companyId, personType: 'INDIVIDUAL', name: 'CLIENTE VALIDACAO GRADE' } });
      const seller = await tx.salesSeller.create({ data: { companyId, name: 'VENDEDOR VALIDACAO GRADE', commission: 0 } });
      const orderInput = { requestId: randomUUID(), customerId: customer.id, sellerId: seller.id, customerName: customer.name, sellerName: seller.name, saleType: 'CONDICIONAL', status: 'EM_ANDAMENTO', paymentMethod: 'DINHEIRO', discount: 0, addition: 0, items: [{ productId: child.id, quantity: 2 }] };
      const conditional = await service.createOrder(companyId, orderInput);
      assert.equal((await tx.salesProduct.findUnique({ where: { id: child.id } })).reservedStock.toNumber(), 2);
      assert.equal((await tx.salesProduct.findUnique({ where: { id: children.find((item) => item.gridValue === 'M').id } })).reservedStock.toNumber(), 0);
      await assert.rejects(service.deleteProduct(companyId, parent.id), /vinculado/);
      await assert.rejects(service.createOrder(companyId, { ...orderInput, requestId: randomUUID(), items: [{ productId: parent.id, quantity: 1 }] }), /matriz/);
      await service.cancelOrder(companyId, conditional.id, 'VALIDACAO LOCAL REVERTIDA');
      await service.applyOrderStock(tx, companyId, [{ productId: child.id, stockManaged: true, quantity: 1 }], -1);
      assert.equal((await tx.salesProduct.findUnique({ where: { id: child.id } })).stock.toNumber(), 3);
      assert.equal((await tx.salesProduct.findUnique({ where: { id: parent.id } })).stock.toNumber(), 0);
      const simple = await service.createProduct(companyId, { name: 'VALIDACAO CONVERSAO', category: 'VALIDACAO', brand: 'VALIDACAO', price: 50, stock: 6, manageStock: true });
      const converted = await service.updateProduct(companyId, simple.id, { expectedUpdatedAt: simple.updatedAt.toISOString(), category: simple.category, brand: simple.brand, stock: 6, gridId: grid.id, variants: [{ name: 'P', stock: 2 }, { name: 'M', stock: 4 }] });
      assert.equal(converted.isGridParent, true);
      assert.equal(converted.variants.length, 2);
      assert.equal(converted.stock.toNumber(), 6);
      await service.deleteProduct(companyId, simple.id);
      assert.equal(await tx.salesProduct.count({ where: { companyId, parentProductId: simple.id } }), 0);
      approved = true;
      throw rollback;
    }, { maxWait: 10000, timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await prisma.$disconnect(); }
  assert.ok(approved);
  console.log('APROVADO: cadastros reais, códigos, estoques, grade, edição, concorrência, condicional, venda por opção, proteção de histórico, conversão e exclusão. Transação revertida.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
