const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { config } = require('dotenv');
const path = require('node:path');
config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const url = new URL(connectionString);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/contrx') throw new Error('Teste permitido somente no banco local contrx, porta 55432.');
  process.env.DATABASE_URL = connectionString;
  const { PrismaService } = require('../dist/src/prisma/prisma.service');
  const { VendasService } = require('../dist/src/vendas/vendas.service');
  const prisma = new PrismaService();
  const rollback = new Error('ROLLBACK_DO_TESTE_LOCAL');
  try {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { tradeName: 'HOMOLOGAÇÃO TRANSACIONAL VENDAS' } });
      await tx.appSettings.create({ data: { companyId: company.id, companySettings: { ramoAtividade: 'CONFECCOES' } } });
      const supplier = await tx.salesSupplier.create({ data: { companyId: company.id, name: 'FORNECEDOR DO TESTE' } });
      const customer = await tx.salesCustomer.create({ data: { companyId: company.id, name: 'CLIENTE DO TESTE', document: '52998224725', address: 'RUA DO TESTE', creditLimit: 500, creditDays: 30 } });
      const seller = await tx.salesSeller.create({ data: { companyId: company.id, name: 'VENDEDOR DO TESTE', commission: 10 } });
      const bank = await tx.bankAccount.create({ data: { companyId: company.id, name: 'CAIXA DO TESTE', type: 'CASH' } });
      const facade = new Proxy(tx, { get(target, key) { return key === '$transaction' ? async (callback) => callback(tx) : target[key]; } });
      const service = new VendasService(facade);
      const { CaixaService } = require('../dist/src/vendas/caixa.service');
      const cash = new CaixaService(facade);
      const operator = { id: randomUUID(), companyId: company.id, name: 'OPERADOR DO TESTE' };
      const opening = { requestId: randomUUID(), accountId: bank.id, direction: 'IN', amount: 20, reason: 'SUPRIMENTO · TROCO DO TESTE' };
      const cashOperation = await cash.create(operator, opening);
      await cash.create(operator, opening);
      const { BancosService } = require('../dist/src/bancos/bancos.service');
      await assert.rejects(() => new BancosService(facade).deleteTransaction(cashOperation.id, company.id), /não podem ser excluídas/);
      assert.equal(Number((await tx.bankAccount.findUniqueOrThrow({ where: { id: bank.id } })).currentBalance), 20);
      await assert.rejects(() => cash.create(operator, { ...opening, amount: 21 }), /outros dados/);
      await assert.rejects(() => cash.create(operator, { ...opening, requestId: randomUUID(), direction: 'OUT', amount: 21 }), /insuficiente/);
      await cash.create(operator, { ...opening, requestId: randomUUID(), direction: 'OUT', reason: 'SANGRIA DO TESTE' });
      // Fixture de variações legadas: novos cadastros de grade exigem SKU individual.
      const product = await tx.salesProduct.create({ data: { companyId: company.id, name: 'CAMISA DO TESTE', price: 100, category: 'ROUPAS', brand: 'MARCA DO TESTE', supplierId: supplier.id, manageStock: true, stock: 10, variations: 'P, G', variants: { create: [{ companyId: company.id, name: 'P', stock: 5 }, { companyId: company.id, name: 'G', stock: 5 }] } }, include: { variants: true } });
      const sizeP = product.variants.find((variant) => variant.name === 'P');
      const sizeG = product.variants.find((variant) => variant.name === 'G');
      const input = (overrides = {}) => ({ requestId: randomUUID(), customerId: customer.id, sellerId: seller.id, customerName: customer.name, sellerName: seller.name, saleType: 'VENDA', items: [{ productId: product.id, variantId: sizeP.id, quantity: 1 }], paymentMethod: 'DINHEIRO', bankAccountId: bank.id, discount: 0, addition: 0, status: 'CONCLUIDA', ...overrides });
      const stock = async () => tx.salesProduct.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } });
      const balance = async () => Number((await tx.bankAccount.findUniqueOrThrow({ where: { id: bank.id } })).currentBalance);

      const conditional = await service.createOrder(company.id, input({ saleType: 'CONDICIONAL', items: [{ productId: product.id, variantId: sizeP.id, quantity: 3 }] }));
      assert.equal(Number((await stock()).stock), 10);
      assert.equal(Number((await stock()).reservedStock), 3);
      const saleInput = input({ version: conditional.version, paymentMethod: 'MISTO', paymentDetails: { DINHEIRO: 50, CREDIARIO: 50 }, cashTender: '75.00' });
      const sale = await service.updateOrder(company.id, conditional.id, saleInput);
      assert.equal((await service.updateOrder(company.id, conditional.id, saleInput)).id, sale.id);
      assert.equal((await service.orderDetails(company.id, sale.id)).cashTender, '75.00');
      assert.equal((await service.orderByRequest(company.id, saleInput.requestId)).id, sale.id);
      assert.equal(sale.id, conditional.id);
      assert.equal(Number((await stock()).stock), 9);
      assert.equal(Number((await stock()).reservedStock), 0);
      assert.equal(await balance(), 50);

      const returned = await service.createOrder(company.id, input({ saleType: 'TROCA', originalOrderId: sale.id, returnedItems: [{ itemIndex: 0, quantity: 1 }], items: [], expectedTotal: -50, returnDisposition: 'CREDIT', bankAccountId: undefined }));
      assert.equal(Number(returned.debtOffset), 50);
      assert.equal(Number((await service.getCustomerCredit(company.id, customer.id)).balance), 50);
      assert.equal(Number((await stock()).stock), 10);
      const purchase = await service.createOrder(company.id, input({ paymentMethod: 'SALDO_CLIENTE', bankAccountId: undefined, items: [{ productId: product.id, variantId: sizeP.id, quantity: 0.5 }] }));
      assert.equal(Number((await service.getCustomerCredit(company.id, customer.id)).balance), 0);
      assert.equal(await balance(), 50);
      assert.equal(Number((await stock()).stock), 9.5);
      assert.equal((await tx.contaPagar.findFirstOrThrow({ where: { salesReturnId: returned.id } })).status, 'PAID');

      await service.reverseOrder(company.id, purchase.id, 'Reverter utilização de crédito');
      await service.reverseOrder(company.id, returned.id, 'Reverter devolução do teste');
      await service.reverseOrder(company.id, sale.id, 'Reverter venda do teste');
      assert.equal(Number((await stock()).stock), 10);
      assert.equal(await tx.salesRefund.count({ where: { companyId: company.id, orderId: sale.id, settledAmount: 0 } }), 1);
      assert.equal(await balance(), 50);
      assert.equal(Number((await service.getCustomerCredit(company.id, customer.id)).balance), 0);

      const cashSale = await service.createOrder(company.id, input({ items: [{ productId: product.id, variantId: sizeG.id, quantity: 1 }] }));
      const refund = await service.createOrder(company.id, input({ saleType: 'TROCA', originalOrderId: cashSale.id, returnedItems: [{ itemIndex: 0, quantity: 1 }], items: [], expectedTotal: -100, returnDisposition: 'REFUND', refundConfirmed: true, paymentMethod: 'PIX' }));
      assert.equal(await balance(), 50);
      assert.equal(Number((await stock()).stock), 10);
      assert.equal((await tx.contaPagar.findFirstOrThrow({ where: { salesReturnId: refund.id } })).status, 'PAID');
      const periodStart = new Date(Date.now() - 86400000).toISOString(), periodEnd = new Date(Date.now() + 86400000).toISOString();
      const statement = await cash.list(company.id, periodStart, periodEnd);
      assert.equal(statement.movements.filter(m => m.kind === 'SUPRIMENTO').length, 1);
      assert.equal(statement.movements.filter(m => m.kind === 'SANGRIA').length, 1);
      assert.equal(statement.movements.find(m => m.kind === 'SUPRIMENTO').operator, operator.name);
      assert.equal(statement.methods.CASH.net, 150);
      assert.equal(statement.methods.PIX.net, -100);
      assert.equal(statement.accounts.find(a => a.id === bank.id).cashBalance, 150);
      assert.equal(statement.accounts.find(a => a.id === bank.id).balance, 50);
      assert.equal(statement.movements.some(m => m.kind === 'ESTORNO'), false); // Saida exige confirmacao financeira.
      const foreign = await tx.company.create({ data: { tradeName: 'OUTRA EMPRESA DO TESTE' } });
      assert.equal((await cash.list(foreign.id, periodStart, periodEnd)).movements.length, 0);
      await assert.rejects(() => cash.create({ ...operator, companyId: foreign.id }, { ...opening, requestId: randomUUID() }), /caixa em dinheiro ativo/);
      await assert.rejects(() => cash.list(company.id, 'invalido', periodEnd), /período/);
      await assert.rejects(() => cash.list(company.id, periodEnd, periodStart), /período/);
      const creditSale = await service.createOrder(company.id, input({ paymentMethod: 'CREDIARIO' }));
      const charge = await tx.contaReceber.findFirstOrThrow({ where: { salesOrderId: creditSale.id } });
      const { ContasReceberService } = require('../dist/src/contas-receber/contas-receber.service');
      const receivables = new ContasReceberService(facade);
      const paidAt = new Date().toISOString();
      await receivables.receivePayment(charge.id, { paidAt, method: 'CASH', amountPaid: 10, bankAccountId: bank.id }, company.id);
      await receivables.receivePayment(charge.id, { paidAt, method: 'PIX', amountPaid: 10, bankAccountId: bank.id }, company.id);
      await receivables.receivePayment(charge.id, { paidAt, method: 'CASH', amountPaid: 20, paymentItems: [{ method: 'CASH', amount: 5 }, { method: 'PIX', amount: 15 }], bankAccountId: bank.id }, company.id);
      const updatedStatement = await cash.list(company.id, periodStart, periodEnd);
      assert.equal(updatedStatement.methods.CASH.net, 165);
      assert.equal(updatedStatement.methods.PIX.net, -75);
      assert.equal(updatedStatement.accounts.find(a => a.id === bank.id).cashBalance, 165);
      await service.reverseOrder(company.id, creditSale.id, 'ESTORNO DAS PARCELAS DO TESTE');
      const afterReverse = await cash.list(company.id, periodStart, periodEnd);
      assert.equal(afterReverse.methods.CASH.net, 165);
      assert.equal(afterReverse.methods.PIX.net, -75);
      const cashAccount = await cash.prepareAccount(company.id);
      assert.equal(cashAccount.id, bank.id);
      assert.equal((await cash.prepareAccount(company.id)).id, bank.id);
      const newAccount = await cash.prepareAccount(foreign.id);
      assert.equal(Number(newAccount.currentBalance), 0);
      assert.equal((await cash.prepareAccount(foreign.id)).id, newAccount.id);
      const { SalesCardsService } = require('../dist/src/vendas/cartoes.controller');
      const cards = new SalesCardsService(facade);
      const administrator = await cards.create(company.id, 'ADM DO TESTE');
      assert.equal((await cards.create(company.id, '  adm do teste  ')).id, administrator.id);
      assert.equal((await cards.list(foreign.id)).length, 0);
      assert.equal((await tx.appSettings.findUniqueOrThrow({ where: { companyId: company.id } })).companySettings.ramoAtividade, 'CONFECCOES');
      for (const [method, expected] of [['DINHEIRO','CASH'],['PIX','PIX'],['CARTAO_DEBITO','DEBIT_CARD'],['CARTAO_CREDITO','CREDIT_CARD']]) {
        const cardPayments = method.startsWith('CARTAO_') ? [{ method, administratorId: administrator.id, brand: 'Visa', lastFour: '1234', nsu: 'TESTE-' + method, authorizationCode: 'AUT-123', installments: method === 'CARTAO_DEBITO' ? 1 : 3, amount: 100 }] : undefined;
        const paidInput = input({ paymentMethod: method, cardPayments });
        const paidSale = await service.createOrder(company.id, paidInput);
        if (cardPayments) {
          assert.equal(paidSale.cardPayments[0].administratorName, administrator.name);
          assert.equal(paidSale.cardPayments[0].nsu, cardPayments[0].nsu);
          assert.equal((await service.listOrders(company.id)).find(row => row.id === paidSale.id).cardPayments[0].lastFour, '1234');
          assert.equal((await service.createOrder(company.id, paidInput)).id, paidSale.id);
          await assert.rejects(() => service.createOrder(company.id, { ...paidInput, cardPayments: [{ ...cardPayments[0], nsu: 'OUTRO-NSU' }] }), /outros dados de cartão/);
          const { validateCardPayments } = require('../dist/src/vendas/card-payment');
          await assert.rejects(() => validateCardPayments(tx, foreign.id, paidInput, paidSale), /administradora/);
          await assert.rejects(() => validateCardPayments(tx, company.id, { ...paidInput, cardPayments: [{ ...cardPayments[0], amount: 99 }] }, paidSale), /valor/);
        }
        const paidCharge = await tx.contaReceber.findFirstOrThrow({ where: { salesOrderId: paidSale.id }, include: { payments: true } });
        assert.equal(paidCharge.status, 'PAID');
        assert.equal(paidCharge.payments[0].method, expected);
        assert.equal(Number(paidCharge.payments[0].amountPaid), 100);
      }
      const draft = await service.createOrder(company.id, input({ paymentMethod: 'MISTO', paymentDetails: { DINHEIRO: 10 }, status: 'EM_ANDAMENTO' }));
      assert.equal(await tx.contaReceber.count({ where: { salesOrderId: draft.id } }), 0);
      await service.updateOrder(company.id, draft.id, input({ version: draft.version, paymentMethod: 'PIX' }));
      assert.equal(await tx.contaReceber.count({ where: { salesOrderId: draft.id } }), 1);
      console.log('Pagamentos: dinheiro, Pix, débito, crédito, misto em andamento e criação de caixa APROVADOS.');
      console.log('Caixa: suprimento, sangria, idempotência, saldo físico, formas, estornos e isolamento APROVADOS.');
      console.log(JSON.stringify({ validacao: 'APROVADA', banco: 'LOCAL', modo: 'ROLLBACK', cenarios: ['fornecedor por ID', 'variações', 'reserva de condicional', 'conversão do mesmo documento', 'pagamento misto', 'abatimento de dívida', 'crédito e utilização', 'reembolso', 'estornos e saldos'] }));
      throw rollback;
    }, { maxWait: 10000, timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
