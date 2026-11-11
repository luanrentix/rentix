import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { VendasService } from './vendas.service';

const decimal = (value: number | string) => new Prisma.Decimal(value);

function fixture() {
  const product = {
    id: 'product',
    name: 'CAMISA',
    sku: '1',
    unit: 'UN',
    price: decimal(100),
    promotionalPrice: null,
    stock: decimal(10),
    reservedStock: decimal(0),
    manageStock: true,
    supplierId: null,
    supplierName: null,
    commissionEnabled: false,
    commissionType: 'VENDEDOR',
    commissionRule: 'PADRAO',
    commission: decimal(0),
    variants: [] as Array<Record<string, any>>,
    inheritGridPrice: true,
    allowDiscount: true,
    allowAddition: true,
  };
  const customer = {
    id: 'customer',
    name: 'CLIENTE',
    isSystem: false,
    referenceOnly: false,
    document: '52998224725',
    address: 'RUA DE TESTE',
    creditBlocked: false,
    creditLimit: decimal(500),
    creditDays: 30,
  };
  const seller = { id: 'seller', name: 'VENDEDOR', commission: decimal(10) };
  const orders: Array<Record<string, any>> = [];
  const charges: Array<Record<string, any>> = [];
  const transactions: Array<Record<string, any>> = [];
  const credits: Array<Record<string, any>> = [];
  const refunds: Array<Record<string, any>> = [];
  const payables: Array<Record<string, any>> = [];
  const bank = { currentBalance: decimal(0) };
  const tx = {
    salesCreditAdjustment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: decimal(0) } }),
    },
    salesRefund: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const refund = {
          ...data,
          id: `refund-${refunds.length}`,
          settledAmount: decimal(0),
        };
        refunds.push(refund);
        return refund;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'company' }]),
    appSettings: {
      findUnique: jest.fn().mockResolvedValue({
        companySettings: {
          ramoAtividade: 'CONFECCOES',
          salesCardAdministrators: [{ id: 'admin', name: 'ADMIN TESTE' }],
        },
      }),
    },
    salesProduct: {
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.id?.in?.length === 0 ? [] : [product],
        ),
      findFirst: jest.fn().mockImplementation(async () => product),
      updateMany: jest.fn().mockImplementation(async ({ data }) => {
        for (const key of ['stock', 'reservedStock'] as const) {
          if (!data[key]) continue;
          product[key] = data[key].increment
            ? product[key].add(data[key].increment)
            : product[key].sub(data[key].decrement);
        }
        return { count: 1 };
      }),
    },
    salesCustomer: {
      findFirst: jest.fn().mockImplementation(async () => customer),
      findFirstOrThrow: jest.fn().mockImplementation(async () => customer),
    },
    salesSeller: { findFirst: jest.fn().mockResolvedValue(seller) },
    salesOrder: {
      count: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            orders.filter(
              (order) =>
                order.originalOrderId === where.originalOrderId &&
                order.status === where.status &&
                (!where.number?.gt || order.number > where.number.gt),
            ).length,
        ),
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          orders.filter(
            (order) =>
              order.originalOrderId === where.originalOrderId &&
              order.status === where.status,
          ),
        ),
      findFirst: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            orders.find((order) =>
              where.id
                ? order.id === where.id
                : order.requestId === where.requestId,
            ) ?? null,
        ),
      findFirstOrThrow: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          orders.find((order) => order.id === where.id),
        ),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const order = {
          id: `order-${orders.length}`,
          number: orders.length + 1,
          version: 1,
          ...data,
        };
        orders.push(order);
        return order;
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        const order = orders.find(
          (entry) => entry.id === where.id && entry.version === where.version,
        );
        if (!order) return { count: 0 };
        Object.assign(order, { ...data, version: order.version + 1 });
        return { count: 1 };
      }),
    },
    contaReceber: {
      count: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            charges.filter(
              (charge) => charge.salesOrderId === where.salesOrderId,
            ).length,
        ),
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          charges.filter(
            (charge) =>
              !charge.cancelledAt &&
              (where.salesOrderId
                ? charge.salesOrderId === where.salesOrderId
                : charge.salesCustomerId === where.salesCustomerId &&
                  charge.status === 'PENDING'),
          ),
        ),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const charge = {
          id: `charge-${charges.length}`,
          payments: [],
          ...data,
        };
        charges.push(charge);
        return charge;
      }),
      findFirst: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          charges.find((charge) => charge.id === where.id),
        ),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const charge = charges.find((entry) => entry.id === where.id)!;
        Object.assign(charge, data, {
          amount:
            data.amount === undefined ? charge.amount : decimal(data.amount),
        });
        return charge;
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        for (const charge of charges)
          if (where.id.in.includes(charge.id)) Object.assign(charge, data);
        return { count: charges.length };
      }),
    },
    pagamentoRecebido: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const charge = charges.find((entry) => entry.id === data.chargeId)!;
        const payment = {
          ...data,
          amountPaid: decimal(data.amountPaid),
          discount: decimal(0),
          interest: decimal(0),
        };
        charge.payments.push(payment);
        return payment;
      }),
    },
    bankAccount: {
      findFirst: jest.fn().mockResolvedValue({ id: 'bank' }),
      update: jest.fn().mockImplementation(async ({ data }) => {
        bank.currentBalance = data.currentBalance.increment
          ? bank.currentBalance.add(data.currentBalance.increment)
          : bank.currentBalance.sub(data.currentBalance.decrement);
      }),
    },
    bankTransaction: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const entry = { id: `bank-${transactions.length}`, ...data };
        transactions.push(entry);
        return entry;
      }),
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          transactions.filter((entry) =>
            where.OR.some(
              (filter: any) =>
                entry.referenceType === filter.referenceType &&
                (typeof filter.referenceId === 'string'
                  ? entry.referenceId === filter.referenceId
                  : filter.referenceId.in.includes(entry.referenceId)),
            ),
          ),
        ),
    },
    salesOrderEvent: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    salesStockMovement: { create: jest.fn().mockResolvedValue({}) },
    salesCustomerCredit: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const credit = { ...data, id: `credit-${credits.length}` };
        credits.push(credit);
        return credit;
      }),
      aggregate: jest.fn().mockImplementation(async () => ({
        _sum: {
          amount: credits
            .filter((entry) => !entry.reversedAt)
            .reduce((sum, entry) => sum.add(entry.amount), decimal(0)),
        },
      })),
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          credits.filter(
            (entry) => entry.orderId === where.orderId && !entry.reversedAt,
          ),
        ),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        credits
          .filter(
            (entry) => entry.orderId === where.orderId && !entry.reversedAt,
          )
          .forEach((entry) => Object.assign(entry, data));
        return { count: 1 };
      }),
    },
    salesProductVariant: {
      findFirst: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          product.variants.find((variant) => variant.id === where.id),
        ),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const variant = product.variants.find(
          (entry) => entry.id === where.id,
        )!;
        for (const key of ['stock', 'reservedStock'])
          if (data[key])
            variant[key] = data[key].increment
              ? variant[key].add(data[key].increment)
              : variant[key].sub(data[key].decrement);
        return variant;
      }),
    },
    contaPagar: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const payable = {
          id: `payable-${payables.length}`,
          payments: [],
          ...data,
        };
        payables.push(payable);
        return payable;
      }),
      findMany: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          payables.filter(
            (entry) =>
              !entry.cancelledAt &&
              (where.salesReturnId
                ? entry.salesReturnId === where.salesReturnId
                : orders.some(
                    (order) =>
                      order.id === entry.salesReturnId &&
                      order.customerId === where.salesReturn?.customerId &&
                      order.returnDisposition === 'CREDIT' &&
                      order.status === 'CONCLUIDA',
                  )),
          ),
        ),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const payable = payables.find((entry) => entry.id === where.id)!;
        Object.assign(payable, data);
        return payable;
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        payables
          .filter(
            (entry) =>
              entry.salesReturnId === where.salesReturnId && !entry.cancelledAt,
          )
          .forEach((entry) => Object.assign(entry, data));
        return { count: 1 };
      }),
    },
    pagamentoRealizado: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const payable = payables.find((entry) => entry.id === data.expenseId)!;
        const payment = {
          id: `expense-payment-${payable.payments.length}`,
          ...data,
        };
        payable.payments.push(payment);
        return payment;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) =>
        payables
          .filter((entry) => !entry.cancelledAt)
          .flatMap((entry) => entry.payments)
          .filter((entry) => entry.note === where.note),
      ),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest
      .fn()
      .mockImplementation(async (callback) => callback(tx)),
  };
  const service = new VendasService(prisma as unknown as PrismaService);
  const input = (overrides: Partial<CriarVendaDto> = {}): CriarVendaDto => ({
    requestId: 'request',
    customerId: customer.id,
    sellerId: seller.id,
    customerName: customer.name,
    sellerName: seller.name,
    saleType: 'VENDA',
    items: [{ productId: product.id, quantity: 3 }],
    paymentMethod: 'DINHEIRO',
    bankAccountId: 'bank',
    discount: 0,
    addition: 0,
    status: 'CONCLUIDA',
    refundConfirmed: true,
    ...overrides,
  });
  return {
    service,
    tx,
    product,
    customer,
    seller,
    orders,
    charges,
    transactions,
    credits,
    refunds,
    payables,
    bank,
    input,
  };
}

describe('Vendas: estoque, crédito e recebimentos', () => {
  it('não permite desconto geral em itens selecionados como promoção', async () => {
    const f = fixture();
    f.product.promotionalPrice = decimal(80) as never;
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          discount: 1,
          items: [
            {
              productId: 'product',
              quantity: 1,
              priceType: 'PROMOCIONAL',
              unitPrice: 80,
            },
          ],
        }),
      ),
    ).rejects.toThrow('desconto supera');
  });
  it('mantém linhas normal e promocional separadas com ajustes nos itens', async () => {
    const f = fixture();
    f.product.promotionalPrice = decimal(80) as never;
    const order = await f.service.createOrder(
      'company',
      f.input({
        items: [
          {
            productId: 'product',
            quantity: 1,
            priceType: 'NORMAL',
            discount: 10,
            unitPrice: 90,
          },
          {
            productId: 'product',
            quantity: 1,
            priceType: 'PROMOCIONAL',
            unitPrice: 80,
          },
        ],
      }),
    );
    expect(order.total.toNumber()).toBe(170);
    expect(order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priceType: 'NORMAL',
          originalUnitPrice: '100',
          discount: '10',
        }),
        expect.objectContaining({
          priceType: 'PROMOCIONAL',
          originalUnitPrice: '100',
          discount: '0',
        }),
      ]),
    );
    expect(f.product.stock.toNumber()).toBe(8);
  });
  it.each(['ORCAMENTO', 'CONDICIONAL'])(
    'consulta endereço de %s somente na empresa autenticada',
    async (saleType) => {
      const f = fixture();
      const order = await f.service.createOrder(
        'company',
        f.input({ saleType }),
      );
      f.tx.salesOrder.findFirst.mockResolvedValue({ ...order, events: [] });
      const details = await f.service.orderDetails('company', order.id);
      expect(details.customer?.address).toBe('RUA DE TESTE');
      expect(details.customer?.name).toBe('CLIENTE');
      expect(f.tx.salesCustomer.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'customer', companyId: 'company' },
          select: expect.objectContaining({
            name: true,
            address: true,
            phone: true,
            phone2: true,
            email: true,
          }),
        }),
      );
    },
  );
  it('recupera atualização já processada sem repetir estoque ou recebimento', async () => {
    const f = fixture();
    const draft = await f.service.createOrder(
      'company',
      f.input({ status: 'EM_ANDAMENTO' }),
    );
    const attempt = f.input({
      requestId: 'retry-update',
      version: draft.version,
      cashTender: '350.00',
    });
    const saved = await f.service.updateOrder('company', draft.id, attempt);
    const calls = f.tx.salesOrderEvent.create.mock.calls;
    const event = calls[calls.length - 1][0].data;
    f.tx.salesOrderEvent.findFirst.mockResolvedValue(event);
    const repeated = await f.service.updateOrder('company', draft.id, attempt);
    expect(repeated.id).toBe(saved.id);
    expect(f.product.stock.toNumber()).toBe(7);
    expect(f.charges).toHaveLength(1);
    await expect(
      f.service.updateOrder('company', draft.id, {
        ...attempt,
        notes: 'alterada',
      }),
    ).rejects.toThrow('outros dados');
  });

  it('exige metadados de cartão e rejeita dinheiro entregue insuficiente', async () => {
    const f = fixture();
    await expect(
      f.service.createOrder(
        'company',
        f.input({ paymentMethod: 'CARTAO_DEBITO' }),
      ),
    ).rejects.toThrow('NSU');
    await expect(
      f.service.createOrder(
        'company',
        f.input({ requestId: 'cash', cashTender: '299.99' }),
      ),
    ).rejects.toThrow('parcela em dinheiro');
  });
  it('impede reduzir preco de produto que nao permite desconto', async () => {
    const f = fixture();
    f.product.allowDiscount = false;
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          items: [{ productId: 'product', quantity: 1, unitPrice: 90 }],
        }),
      ),
    ).rejects.toThrow('não permite desconto');
  });
  it('impede desconto geral sobre produto que nao permite desconto', async () => {
    const f = fixture();
    f.product.allowDiscount = false;
    await expect(
      f.service.createOrder('company', f.input({ discount: 10 })),
    ).rejects.toThrow('permitem desconto');
  });
  it('impede acrescimo unitario e geral quando o produto nao permite', async () => {
    const f = fixture();
    f.product.allowAddition = false;
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          items: [{ productId: 'product', quantity: 1, unitPrice: 110 }],
        }),
      ),
    ).rejects.toThrow('não permite acréscimo');
    await expect(
      f.service.createOrder('company', f.input({ addition: 10 })),
    ).rejects.toThrow('não permitem acréscimo');
  });
  it('exclui venda em andamento por cancelamento, preservando o documento e sem gerar financeiro', async () => {
    const f = fixture();
    const order = await f.service.createOrder(
      'company',
      f.input({ status: 'EM_ANDAMENTO' }),
    );
    const removed = await f.service.discardOrder(
      'company',
      order.id,
      'Exclusão confirmada',
      'actor',
    );
    expect(removed.status).toBe('CANCELADA');
    expect(f.orders).toHaveLength(1);
    expect(f.charges).toHaveLength(0);
    expect(f.transactions).toHaveLength(0);
    expect(f.tx.salesOrder.findFirst).toHaveBeenCalledWith({
      where: { id: order.id, companyId: 'company' },
    });
    await expect(
      f.service.discardOrder('company', order.id, 'Repetição'),
    ).rejects.toThrow('Somente vendas em andamento');
  });

  it('não permite excluir venda concluída pela ação de Em andamento', async () => {
    const f = fixture();
    const order = await f.service.createOrder('company', f.input());
    await expect(
      f.service.discardOrder('company', order.id, 'Exclusão solicitada'),
    ).rejects.toThrow('Somente vendas em andamento');
    expect(f.orders[0].status).toBe('CONCLUIDA');
    expect(f.transactions).toHaveLength(1);
  });

  it('recusa exclusão se outro operador finalizar ou alterar a versão antes do bloqueio', async () => {
    const f = fixture();
    const order = await f.service.createOrder(
      'company',
      f.input({ status: 'EM_ANDAMENTO' }),
    );
    f.tx.salesOrder.findFirst
      .mockResolvedValueOnce({ ...order })
      .mockResolvedValueOnce({
        ...order,
        status: 'CONCLUIDA',
        version: order.version + 1,
      });
    await expect(
      f.service.discardOrder('company', order.id, 'Exclusão solicitada'),
    ).rejects.toThrow('A venda foi alterada');
  });

  it.each(['CREDIARIO', 'MISTO'])(
    'bloqueia %s para cliente apenas referência, mesmo com limite e prazo',
    async (paymentMethod) => {
      const f = fixture();
      f.customer.referenceOnly = true;
      await expect(
        f.service.createOrder(
          'company',
          f.input({
            paymentMethod,
            ...(paymentMethod === 'MISTO'
              ? { paymentDetails: { DINHEIRO: 200, CREDIARIO: 100 } }
              : {}),
          }),
        ),
      ).rejects.toThrow('apenas referência');
      expect(f.orders).toHaveLength(0);
      expect(f.charges).toHaveLength(0);
    },
  );

  it('permite venda à vista para cliente apenas referência sem documento e endereço', async () => {
    const f = fixture();
    f.customer.referenceOnly = true;
    f.customer.document = '';
    f.customer.address = '';
    await f.service.createOrder('company', f.input());
    expect(f.orders).toHaveLength(1);
  });

  it('exige cadastro completo para crediário mesmo se a referência estiver desmarcada', async () => {
    const f = fixture();
    f.customer.document = '';
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).rejects.toThrow('cadastro completo');
  });
  it('rejeita condicional para consumidor final sem criar pedido ou reserva', async () => {
    const f = fixture();
    f.customer.isSystem = true;
    await expect(
      f.service.createOrder('company', f.input({ saleType: 'CONDICIONAL' })),
    ).rejects.toThrow('CONSUMIDOR FINAL não é permitido');
    expect(f.orders).toHaveLength(0);
    expect(f.product.reservedStock.toNumber()).toBe(0);
  });

  it('impede converter pedido de consumidor final em condicional', async () => {
    const f = fixture();
    f.customer.isSystem = true;
    const order = await f.service.createOrder(
      'company',
      f.input({ saleType: 'PEDIDO' }),
    );
    await expect(
      f.service.updateOrder(
        'company',
        order.id,
        f.input({ version: 1, saleType: 'CONDICIONAL' }),
      ),
    ).rejects.toThrow('CONSUMIDOR FINAL não é permitido');
    expect(f.product.reservedStock.toNumber()).toBe(0);
  });
  it('exige conciliação de venda antiga sem títulos financeiros vinculados', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    f.charges.length = 0;
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          requestId: 'legacy-return',
          saleType: 'TROCA',
          originalOrderId: original.id,
          returnedItems: [{ itemIndex: 0, quantity: 1 }],
          items: [],
          expectedTotal: -100,
          returnDisposition: 'REFUND',
        }),
      ),
    ).rejects.toThrow('Concilie os recebimentos');
    expect(f.product.stock.toNumber()).toBe(7);
    expect(f.bank.currentBalance.toNumber()).toBe(300);
  });
  it('reserva o condicional e converte o mesmo documento baixando apenas os itens mantidos', async () => {
    const f = fixture();
    const conditional = await f.service.createOrder(
      'company',
      f.input({ saleType: 'CONDICIONAL' }),
    );
    expect(f.product.stock.toNumber()).toBe(10);
    expect(f.product.reservedStock.toNumber()).toBe(3);
    expect(f.charges).toHaveLength(0);
    const sale = await f.service.updateOrder(
      'company',
      conditional.id,
      f.input({ version: 1, items: [{ productId: 'product', quantity: 1 }] }),
    );
    expect(sale.id).toBe(conditional.id);
    expect(f.orders).toHaveLength(1);
    expect(f.product.stock.toNumber()).toBe(9);
    expect(f.product.reservedStock.toNumber()).toBe(0);
    expect(f.charges).toHaveLength(1);
    expect(f.bank.currentBalance.toNumber()).toBe(100);
  });

  it('cancela o condicional e libera a reserva sem alterar o estoque físico', async () => {
    const f = fixture();
    const order = await f.service.createOrder(
      'company',
      f.input({ saleType: 'CONDICIONAL', status: 'EM_ANDAMENTO' }),
    );
    await f.service.cancelOrder(
      'company',
      order.id,
      'Todos os itens devolvidos',
    );
    expect(f.product.stock.toNumber()).toBe(10);
    expect(f.product.reservedStock.toNumber()).toBe(0);
    expect(f.charges).toHaveLength(0);
  });

  it('permite venda acima do disponível preservando a reserva do condicional', async () => {
    const f = fixture();
    await f.service.createOrder(
      'company',
      f.input({ saleType: 'CONDICIONAL' }),
    );
    await f.service.createOrder(
      'company',
      f.input({
        requestId: 'second',
        items: [{ productId: 'product', quantity: 8 }],
      }),
    );
    expect(f.orders).toHaveLength(2);
    expect(f.product.stock.toNumber()).toBe(2);
    expect(f.product.reservedStock.toNumber()).toBe(3);
  });

  it.each([0, -2])(
    'conclui venda com estoque inicial %s e registra saldo negativo',
    async (stock) => {
      const f = fixture();
      f.product.stock = decimal(stock);
      await f.service.createOrder('company', f.input());
      expect(f.product.stock.toNumber()).toBe(stock - 3);
      expect(f.charges).toHaveLength(1);
    },
  );

  it.each(['ORCAMENTO', 'PEDIDO'])(
    '%s não baixa nem reserva estoque e não gera recebimento',
    async (saleType) => {
      const f = fixture();
      await f.service.createOrder('company', f.input({ saleType }));
      expect(f.product.stock.toNumber()).toBe(10);
      expect(f.product.reservedStock.toNumber()).toBe(0);
      expect(f.charges).toHaveLength(0);
    },
  );

  it.each(['VENDA', 'CONDICIONAL', 'ORCAMENTO', 'PEDIDO'])(
    'estorna %s preservando o histórico e revertendo apenas seus efeitos',
    async (saleType) => {
      const f = fixture();
      const order = await f.service.createOrder(
        'company',
        f.input({ saleType }),
      );
      await f.service.reverseOrder('company', order.id, 'Estorno solicitado');
      expect(f.orders.find((item) => item.id === order.id)?.status).toBe(
        'ESTORNADA',
      );
      expect(f.product.stock.toNumber()).toBe(10);
      expect(f.product.reservedStock.toNumber()).toBe(0);
      expect(f.bank.currentBalance.toNumber()).toBe(
        saleType === 'VENDA' ? 300 : 0,
      );
      if (saleType !== 'VENDA') {
        expect(f.charges).toHaveLength(0);
        expect(f.transactions).toHaveLength(0);
      }
      await expect(
        f.service.reverseOrder('company', order.id, 'Repetição'),
      ).rejects.toThrow();
    },
  );

  it.each(['VENDA', 'CONDICIONAL', 'ORCAMENTO', 'PEDIDO'])(
    'cancela %s em andamento sem criar movimentação financeira',
    async (saleType) => {
      const f = fixture();
      const order = await f.service.createOrder(
        'company',
        f.input({ saleType, status: 'EM_ANDAMENTO' }),
      );
      await f.service.cancelOrder(
        'company',
        order.id,
        'Cancelamento solicitado',
      );
      expect(f.orders.find((item) => item.id === order.id)?.status).toBe(
        'CANCELADA',
      );
      expect(f.product.stock.toNumber()).toBe(10);
      expect(f.product.reservedStock.toNumber()).toBe(0);
      expect(f.transactions).toHaveLength(0);
    },
  );

  it('uma repetição da mesma gravação não duplica pedido, estoque ou financeiro', async () => {
    const f = fixture();
    const a = await f.service.createOrder('company', f.input());
    const b = await f.service.createOrder('company', f.input());
    expect(a.id).toBe(b.id);
    expect(f.orders).toHaveLength(1);
    expect(f.charges).toHaveLength(1);
    expect(f.product.stock.toNumber()).toBe(7);
  });

  it('recusa edição com versão antiga', async () => {
    const f = fixture();
    const order = await f.service.createOrder(
      'company',
      f.input({ saleType: 'CONDICIONAL' }),
    );
    await expect(
      f.service.updateOrder('company', order.id, f.input({ version: 2 })),
    ).rejects.toThrow('A venda foi alterada');
    expect(f.product.reservedStock.toNumber()).toBe(3);
  });

  it('não reativa documentos cancelados nem permite edição de venda concluída', async () => {
    const f = fixture();
    const order = await f.service.createOrder('company', f.input());
    await expect(
      f.service.updateOrder('company', order.id, f.input({ version: 1 })),
    ).rejects.toThrow('Venda encerrada');
    await f.service.cancelOrder('company', order.id, 'Cancelamento solicitado');
    await expect(
      f.service.updateOrder('company', order.id, f.input({ version: 2 })),
    ).rejects.toThrow('Venda encerrada');
  });

  it('estorna estoque uma única vez e solicita devolução sem registrar saída antes da confirmação', async () => {
    const f = fixture();
    const order = await f.service.createOrder('company', f.input());
    await f.service.reverseOrder('company', order.id, 'Devolução integral');
    expect(f.product.stock.toNumber()).toBe(10);
    expect(f.bank.currentBalance.toNumber()).toBe(300);
    expect(f.transactions.map((entry) => entry.type)).toEqual(['INFLOW']);
    expect(f.refunds).toHaveLength(1);
    expect(f.refunds[0].amount.toNumber()).toBe(300);
    expect(f.charges[0].cancelledAt).toBeInstanceOf(Date);
    await expect(
      f.service.reverseOrder('company', order.id, 'Repetição'),
    ).rejects.toThrow();
    expect(f.transactions).toHaveLength(1);
  });

  it.each([
    { PIX: -1, DINHEIRO: 301 },
    { PIX: null },
    { PIX: '300' },
    { PIX: 299 },
    { PIX: 300, OUTRO: 0 },
    { DEBITO: 150, CARTAO_DEBITO: 150 },
    { PIX: 299.999, DINHEIRO: 0.001 },
  ])(
    'rejeita composição inválida de pagamento misto: %j',
    async (paymentDetails) => {
      const f = fixture();
      await expect(
        f.service.createOrder(
          'company',
          f.input({ paymentMethod: 'MISTO', paymentDetails }),
        ),
      ).rejects.toThrow();
      expect(f.orders).toHaveLength(0);
    },
  );

  it('divide o crediário em centavos exatos e aplica prazo do cliente', async () => {
    const f = fixture();
    f.product.price = decimal('100.01');
    await f.service.createOrder(
      'company',
      f.input({
        paymentMethod: 'CREDIARIO',
        installments: 3,
        items: [{ productId: 'product', quantity: 1 }],
      }),
    );
    expect(f.charges.map((charge) => charge.amount.toString())).toEqual([
      '33.34',
      '33.34',
      '33.33',
    ]);
    expect(f.charges.every((charge) => charge.status === 'PENDING')).toBe(true);
    expect(
      f.charges[1].dueDate.getTime() - f.charges[0].dueDate.getTime(),
    ).toBe(30 * 86400000);
    expect(f.bank.currentBalance.toNumber()).toBe(0);
  });

  it('bloqueia crediário de cliente bloqueado, sem prazo ou sem limite disponível', async () => {
    const f = fixture();
    f.customer.creditBlocked = true;
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).rejects.toThrow('bloqueado');
    f.customer.creditBlocked = false;
    f.customer.creditDays = 0;
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).rejects.toThrow('prazo');
    f.customer.creditDays = 30;
    f.customer.creditLimit = decimal(200);
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).rejects.toThrow('limite');
  });

  it('considera saldo devedor existente e recebimentos parciais no limite', async () => {
    const f = fixture();
    f.charges.push({
      id: 'old',
      salesCustomerId: 'customer',
      status: 'PENDING',
      amount: decimal(300),
      payments: [
        {
          amountPaid: decimal(150),
          discount: decimal(0),
          interest: decimal(0),
        },
      ],
    });
    f.customer.creditLimit = decimal(400);
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).rejects.toThrow('limite');
    f.customer.creditLimit = decimal(450);
    await expect(
      f.service.createOrder('company', f.input({ paymentMethod: 'CREDIARIO' })),
    ).resolves.toBeTruthy();
  });

  it('calcula comissão líquida no preço normal com ajuste por item', async () => {
    const f = fixture();
    f.product.promotionalPrice = decimal(80) as never;
    f.product.commissionEnabled = true;
    f.product.commissionRule = 'VALOR_LIQUIDO';
    const order = await f.service.createOrder(
      'company',
      f.input({
        discount: 40,
        items: [
          {
            productId: 'product',
            quantity: 3,
            priceType: 'NORMAL',
            unitPrice: 80,
            discount: 20,
          },
        ],
      }),
    );
    expect(order.subtotal.toNumber()).toBe(240);
    expect(order.commissionTotal.toNumber()).toBe(20);
  });

  it('normaliza cartão no pagamento misto e separa o crediário do recebimento imediato', async () => {
    const f = fixture();
    const order = await f.service.createOrder(
      'company',
      f.input({
        paymentMethod: 'MISTO',
        paymentDetails: { DEBITO: 100, CREDIARIO: 200 },
        cardPayments: [
          {
            method: 'CARTAO_DEBITO',
            administratorId: 'admin',
            brand: 'Visa',
            nsu: 'TESTE',
            installments: 1,
            amount: 100,
          },
        ],
        installments: 2,
      }),
    );
    expect(order.paymentDetails).toEqual({
      CARTAO_DEBITO: 100,
      CREDIARIO: 200,
    });
    expect(
      f.charges.map((charge) => [charge.amount.toNumber(), charge.status]),
    ).toEqual([
      [100, 'PAID'],
      [100, 'PENDING'],
      [100, 'PENDING'],
    ]);
    expect(f.bank.currentBalance.toNumber()).toBe(100);
  });

  it('não aceita reutilizar a chave de gravação com outro carrinho', async () => {
    const f = fixture();
    await f.service.createOrder('company', f.input());
    await expect(
      f.service.createOrder(
        'company',
        f.input({ items: [{ productId: 'product', quantity: 2 }] }),
      ),
    ).rejects.toThrow('outros dados');
    expect(f.orders).toHaveLength(1);
    expect(f.product.stock.toNumber()).toBe(7);
  });

  it('arredonda cada linha em centavos antes de calcular o total', async () => {
    const f = fixture();
    f.product.price = decimal('0.01');
    const order = await f.service.createOrder(
      'company',
      f.input({ items: [{ productId: 'product', quantity: 0.5 }] }),
    );
    expect(order.total.toString()).toBe('0.01');
    expect(f.charges[0].amount.toString()).toBe('0.01');
  });

  it('rejeita cliente ou produto de outra empresa e exige conta para recebimento à vista', async () => {
    const f = fixture();
    f.tx.salesCustomer.findFirst.mockResolvedValueOnce(null);
    await expect(f.service.createOrder('company', f.input())).rejects.toThrow(
      'Cliente',
    );
    f.tx.salesProduct.findMany.mockResolvedValueOnce([]);
    await expect(f.service.createOrder('company', f.input())).rejects.toThrow(
      'produtos',
    );
    await expect(
      f.service.createOrder('company', f.input({ bankAccountId: undefined })),
    ).rejects.toThrow('conta ou caixa');
  });

  it.each([0, -2])(
    'permite venda de variação com estoque %s',
    async (stock) => {
      const f = fixture();
      f.product.stock = decimal(stock);
      f.product.variants.push({
        id: 'size-p',
        name: 'P',
        stock: decimal(stock),
        reservedStock: decimal(0),
        active: true,
      });
      await f.service.createOrder(
        'company',
        f.input({
          items: [{ productId: 'product', variantId: 'size-p', quantity: 3 }],
        }),
      );
      expect(f.product.stock.toNumber()).toBe(stock - 3);
      expect(f.product.variants[0].stock.toNumber()).toBe(stock - 3);
    },
  );

  it.each([0, -2])(
    'grava condicional com estoque %s e libera a reserva ao converter em venda',
    async (stock) => {
      const f = fixture();
      f.product.stock = decimal(stock);
      f.product.variants.push({
        id: 'size-p',
        name: 'P',
        stock: decimal(stock),
        reservedStock: decimal(0),
        active: true,
      });
      const items = [
        { productId: 'product', variantId: 'size-p', quantity: 3 },
      ];
      const conditional = await f.service.createOrder(
        'company',
        f.input({ saleType: 'CONDICIONAL', items }),
      );
      expect(f.product.stock.toNumber()).toBe(stock);
      expect(f.product.reservedStock.toNumber()).toBe(3);
      expect(f.product.variants[0].reservedStock.toNumber()).toBe(3);
      expect(f.charges).toHaveLength(0);
      await f.service.updateOrder(
        'company',
        conditional.id,
        f.input({ version: 1, items }),
      );
      expect(f.product.stock.toNumber()).toBe(stock - 3);
      expect(f.product.reservedStock.toNumber()).toBe(0);
      expect(f.product.variants[0].stock.toNumber()).toBe(stock - 3);
      expect(f.product.variants[0].reservedStock.toNumber()).toBe(0);
      expect(f.charges).toHaveLength(1);
    },
  );

  it('controla estoque e reserva separadamente por variação', async () => {
    const f = fixture();
    f.product.variants.push(
      {
        id: 'size-p',
        name: 'P',
        stock: decimal(4),
        reservedStock: decimal(0),
        active: true,
      },
      {
        id: 'size-g',
        name: 'G',
        stock: decimal(6),
        reservedStock: decimal(0),
        active: true,
      },
    );
    const conditional = await f.service.createOrder(
      'company',
      f.input({
        saleType: 'CONDICIONAL',
        items: [{ productId: 'product', variantId: 'size-p', quantity: 3 }],
      }),
    );
    expect(f.product.variants[0].reservedStock.toNumber()).toBe(3);
    const extraConditional = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'too-many-p',
        saleType: 'CONDICIONAL',
        items: [{ productId: 'product', variantId: 'size-p', quantity: 2 }],
      }),
    );
    expect(f.product.variants[0].reservedStock.toNumber()).toBe(5);
    expect(f.product.reservedStock.toNumber()).toBe(5);
    expect(f.product.stock.toNumber()).toBe(10);
    await f.service.cancelOrder(
      'company',
      extraConditional.id,
      'Devolução das peças',
    );
    await f.service.createOrder(
      'company',
      f.input({
        requestId: 'sell-g',
        items: [{ productId: 'product', variantId: 'size-g', quantity: 5 }],
      }),
    );
    await f.service.updateOrder(
      'company',
      conditional.id,
      f.input({
        version: 1,
        items: [{ productId: 'product', variantId: 'size-p', quantity: 1 }],
      }),
    );
    expect(f.product.stock.toNumber()).toBe(4);
    expect(f.product.reservedStock.toNumber()).toBe(0);
    expect(
      f.product.variants.map((variant) => variant.stock.toNumber()),
    ).toEqual([3, 1]);
    expect(f.product.variants[0].reservedStock.toNumber()).toBe(0);
  });

  it('exige variação e aplica seu preço quando não herda o preço do produto', async () => {
    const f = fixture();
    f.product.variants.push({
      id: 'size-p',
      name: 'P',
      price: decimal(125),
      stock: decimal(10),
      reservedStock: decimal(0),
      active: true,
    });
    f.product.inheritGridPrice = false;
    await expect(f.service.createOrder('company', f.input())).rejects.toThrow(
      'tamanho/cor',
    );
    const sale = await f.service.createOrder(
      'company',
      f.input({
        items: [{ productId: 'product', variantId: 'size-p', quantity: 1 }],
      }),
    );
    expect(sale.total.toNumber()).toBe(125);
    expect(f.product.variants[0].stock.toNumber()).toBe(9);
  });

  it('devolve para a mesma variação vendida', async () => {
    const f = fixture();
    f.product.variants.push(
      {
        id: 'size-p',
        name: 'P',
        stock: decimal(4),
        reservedStock: decimal(0),
        active: true,
      },
      {
        id: 'size-g',
        name: 'G',
        stock: decimal(6),
        reservedStock: decimal(0),
        active: true,
      },
    );
    const original = await f.service.createOrder(
      'company',
      f.input({
        items: [{ productId: 'product', variantId: 'size-p', quantity: 2 }],
      }),
    );
    await f.service.createOrder(
      'company',
      f.input({
        requestId: 'variant-return',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 1 }],
        items: [],
        expectedTotal: -100,
        returnDisposition: 'REFUND',
      }),
    );
    expect(
      f.product.variants.map((variant) => variant.stock.toNumber()),
    ).toEqual([3, 6]);
    expect(f.product.stock.toNumber()).toBe(9);
  });

  it('cobra a diferença da troca como novo pagamento', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    const exchange = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'exchange',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 1 }],
        items: [{ productId: 'product', quantity: 2 }],
        expectedTotal: 100,
        paymentMethod: 'PIX',
      }),
    );
    expect(exchange.total.toNumber()).toBe(100);
    expect(exchange.returnTotal.toNumber()).toBe(100);
    expect(f.product.stock.toNumber()).toBe(6);
    expect(f.bank.currentBalance.toNumber()).toBe(400);
    expect(f.charges.map((charge) => charge.amount.toNumber())).toEqual([
      300, 100,
    ]);
  });

  it('não registra reembolso sem confirmação efetiva da devolução', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          requestId: 'return',
          saleType: 'TROCA',
          originalOrderId: original.id,
          returnedItems: [{ itemIndex: 0, quantity: 3 }],
          items: [],
          expectedTotal: -300,
          returnDisposition: 'REFUND',
          refundConfirmed: false,
        }),
      ),
    ).rejects.toThrow('devolução efetiva');
    expect(f.transactions).toHaveLength(1);
  });

  it('devolve a diferença pelo banco sem apagar o recebimento original', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    const returned = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'return',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 3 }],
        items: [],
        expectedTotal: -300,
        returnDisposition: 'REFUND',
      }),
    );
    expect(f.bank.currentBalance.toNumber()).toBe(0);
    expect(f.product.stock.toNumber()).toBe(10);
    expect(f.charges[0].amount.toNumber()).toBe(300);
    expect(f.transactions[1].referenceType).toBe('SALES_RETURN');
    expect(f.payables[0].status).toBe('PAID');
    expect(f.payables[0].payments[0].amountPaid.toNumber()).toBe(300);
    await f.service.reverseOrder(
      'company',
      returned.id,
      'Devolução registrada por engano',
    );
    expect(f.bank.currentBalance.toNumber()).toBe(0);
    expect(f.refunds).toHaveLength(1);
    expect(f.product.stock.toNumber()).toBe(7);
    expect(f.payables[0].cancelledAt).toBeInstanceOf(Date);
  });

  it('gera crédito para compra futura e impede estorno do crédito já utilizado', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    const returned = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'credit-return',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 1 }],
        items: [],
        expectedTotal: -100,
        returnDisposition: 'CREDIT',
        bankAccountId: undefined,
      }),
    );
    expect(f.credits[0].amount.toNumber()).toBe(100);
    expect(f.payables[0].status).toBe('PENDING');
    const purchase = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'spend-credit',
        paymentMethod: 'SALDO_CLIENTE',
        bankAccountId: undefined,
        items: [{ productId: 'product', quantity: 1 }],
      }),
    );
    expect(f.credits[1].amount.toNumber()).toBe(-100);
    expect(f.payables[0].status).toBe('PAID');
    expect(f.bank.currentBalance.toNumber()).toBe(300);
    await expect(
      f.service.reverseOrder('company', returned.id, 'Tentativa de estorno'),
    ).rejects.toThrow('já foi utilizado');
    await f.service.reverseOrder('company', purchase.id, 'Desfazer utilização');
    expect(f.payables[0].status).toBe('PENDING');
    await f.service.reverseOrder('company', returned.id, 'Desfazer devolução');
    expect(f.credits.filter((entry) => !entry.reversedAt)).toHaveLength(0);
  });

  it('abate parcelas em aberto antes de gerar crédito ou reembolso e restaura no estorno', async () => {
    const f = fixture();
    const original = await f.service.createOrder(
      'company',
      f.input({ paymentMethod: 'CREDIARIO' }),
    );
    const returned = await f.service.createOrder(
      'company',
      f.input({
        requestId: 'offset',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 1 }],
        items: [],
        expectedTotal: 0,
      }),
    );
    expect(returned.debtOffset.toNumber()).toBe(100);
    expect(f.charges[0].amount.toNumber()).toBe(200);
    expect(f.bank.currentBalance.toNumber()).toBe(0);
    expect(f.credits).toHaveLength(0);
    await f.service.reverseOrder(
      'company',
      returned.id,
      'Devolução por engano',
    );
    expect(f.charges[0].amount.toNumber()).toBe(300);
  });

  it('impede devolver quantidade já devolvida e estornar a origem antes da devolução', async () => {
    const f = fixture();
    const original = await f.service.createOrder('company', f.input());
    await f.service.createOrder(
      'company',
      f.input({
        requestId: 'all-back',
        saleType: 'TROCA',
        originalOrderId: original.id,
        returnedItems: [{ itemIndex: 0, quantity: 3 }],
        items: [],
        expectedTotal: -300,
        returnDisposition: 'REFUND',
      }),
    );
    await expect(
      f.service.createOrder(
        'company',
        f.input({
          requestId: 'again',
          saleType: 'TROCA',
          originalOrderId: original.id,
          returnedItems: [{ itemIndex: 0, quantity: 1 }],
          items: [],
          expectedTotal: -100,
          returnDisposition: 'REFUND',
        }),
      ),
    ).rejects.toThrow('maior que o saldo');
    await expect(
      f.service.reverseOrder('company', original.id, 'Tentativa'),
    ).rejects.toThrow('trocas/devoluções vinculadas');
  });

  it('limita o arredondamento das devoluções parciais ao valor líquido original', async () => {
    const f = fixture();
    const original = await f.service.createOrder(
      'company',
      f.input({ discount: 0.01 }),
    );
    for (const [index, amount] of [100, 100, 99.99].entries()) {
      const returned = await f.service.createOrder(
        'company',
        f.input({
          requestId: `round-return-${index}`,
          saleType: 'TROCA',
          originalOrderId: original.id,
          returnedItems: [{ itemIndex: 0, quantity: 1 }],
          items: [],
          expectedTotal: -amount,
          returnDisposition: 'REFUND',
        }),
      );
      expect(returned.returnTotal.toNumber()).toBe(amount);
    }
    expect(f.bank.currentBalance.toNumber()).toBe(0);
    expect(f.product.stock.toNumber()).toBe(10);
  });
});
