import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ManagementReportService, abcRows } from './management-report.service';
import { ManagementReportQuery } from './management-report.dto';
import { managementReports } from './management-report.catalog';
import { PrismaService } from '../prisma/prisma.service';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

const d = (v: string | number) => new Prisma.Decimal(v);
const user: UsuarioAutenticado = {
  id: 'u',
  name: 'Operador',
  email: '',
  role: 'OWNER',
  companyId: 'empresa-a',
};
const query = { start: '2026-11-01', end: '2026-11-09' };
function setup() {
  const names = [
    'salesOrder',
    'salesOrderEvent',
    'salesProduct',
    'salesStockMovement',
    'contaReceber',
    'contaPagar',
    'pagamentoRecebido',
    'pagamentoRealizado',
    'salesCustomerCredit',
    'bankAccount',
    'bankTransaction',
  ];
  const tx = Object.fromEntries(
    names.map((name) => [name, { findMany: jest.fn().mockResolvedValue([]) }]),
  );
  tx.company = {
    findUniqueOrThrow: jest.fn().mockResolvedValue({ tradeName: 'Empresa A' }),
  } as never;
  const prisma = {
    appSettings: {
      findUnique: jest.fn().mockResolvedValue({
        companySettings: { ramoAtividade: 'CONFECCOES' },
      }),
    },
    $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return {
    tx,
    service: new ManagementReportService(prisma as unknown as PrismaService),
    prisma,
  };
}
function order(overrides = {}) {
  return {
    id: 'o',
    number: 1,
    companyId: 'empresa-a',
    createdAt: new Date('2026-11-02T12:00:00Z'),
    completedAt: null,
    sellerId: 's',
    sellerName: 'Vendedor',
    customerId: 'c',
    customerName: 'Cliente',
    items: [
      {
        productId: 'p',
        name: 'Produto',
        sku: '001',
        quantity: 2,
        subtotal: '100.00',
        unitPrice: '50',
      },
    ],
    subtotal: d(100),
    discount: d(10),
    addition: d(0),
    total: d(90),
    returnTotal: d(0),
    debtOffset: d(0),
    status: 'CONCLUIDA',
    paymentMethod: 'MISTO',
    paymentDetails: { DINHEIRO: 30, PIX: 60 },
    ...overrides,
  };
}

describe('Central de relatórios gerenciais', () => {
  it('nega relatórios fora da configuração Varejo', async () => {
    const { service, prisma } = setup();
    prisma.appSettings.findUnique.mockResolvedValue({
      companySettings: { ramoAtividade: 'IMOBILIARIA' },
    });
    await expect(
      service.generate(user, 'receivables', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('restringe títulos comerciais à origem em vendas e devoluções', async () => {
    const { service, tx } = setup();
    await service.generate(user, 'receivables', query);
    expect(
      tx.contaReceber.findMany.mock.calls[0][0].where.salesOrderId,
    ).toEqual({ not: null });
    await service.generate(user, 'payables', query);
    expect(tx.contaPagar.findMany.mock.calls[0][0].where.salesReturnId).toEqual(
      { not: null },
    );
  });
  it('preserva precisão decimal e classifica item que cruza o limite na classe de origem', () => {
    const rows = abcRows(
      [
        { name: 'A', value: d('0.80') },
        { name: 'B', value: d('0.15') },
        { name: 'C', value: d('0.05') },
      ],
      80,
      95,
    );
    expect(rows.map((r) => [r[2], r[3], r[4]])).toEqual([
      ['80.00', '80.00', 'A'],
      ['15.00', '95.00', 'B'],
      ['5.00', '100.00', 'C'],
    ]);
    expect(abcRows([{ name: 'Único', value: d(100) }], 80, 95)[0][4]).toBe('A');
    expect(abcRows([{ name: 'Zero', value: d(0) }], 80, 95)[0][2]).toBe('0.00');
  });
  it.each(managementReports.map((r) => [r[0]]))(
    '%s: aceita período sem dados e delimita consultas por empresa',
    async (kind) => {
      const { tx, service } = setup();
      const result = await service.generate(user, kind, query);
      expect(result.company).toBe('Empresa A');
      expect(result.count).toBeGreaterThanOrEqual(0);
      for (const model of Object.values(tx)) {
        if ('findMany' in model)
          for (const [args] of model.findMany.mock.calls) {
            expect(JSON.stringify(args.where)).toContain('empresa-a');
            expect(args.take).toBe(20001);
          }
      }
    },
  );
  it('nega consulta e exportação antes de consultar o banco', async () => {
    const { service, prisma } = setup();
    const limited = {
      ...user,
      role: 'USER',
      permissions: ['sales'],
      actionPermissions: ['sales:view'],
    };
    await expect(
      service.generate(limited, 'methods', { ...query, action: 'export' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.generate(limited, 'receivables', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.generate(limited, 'receipts', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.generate(limited, 'payments', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.generate(limited, 'expenses-category', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(
      service.catalog(limited).every((r) => r.permission === 'sales'),
    ).toBe(true);
  });
  it('exige autorização financeira para recebimentos e pagamentos mesmo com acesso de proprietário legado', async () => {
    const { service, prisma } = setup();
    const salesOnlyOwner = {
      ...user,
      role: 'USER',
      permissions: ['sales'],
      actionPermissions: null,
    };
    await expect(
      service.generate(salesOnlyOwner, 'receipts', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.generate(salesOnlyOwner, 'payments', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejeita relatório e filtros inválidos', async () => {
    const { service } = setup();
    await expect(
      service.generate(user, 'inexistente', query),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.generate(user, 'abc', { ...query, abcA: 95, abcB: 80 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.generate(user, 'sellers', { ...query, start: '2027-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.generate(user, 'sellers', {
        ...query,
        minimum: 100,
        maximum: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { ...query, companyId: 'empresa-b' },
        { type: 'query', metatype: ManagementReportQuery },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { ...query, start: '2026-02-30' },
        { type: 'query', metatype: ManagementReportQuery },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('não duplica venda mista e não desconta compensação da modalidade registrada', async () => {
    const { tx, service } = setup();
    tx.salesOrder.findMany.mockResolvedValue([
      order(),
      order({
        id: 'troca',
        paymentMethod: 'PIX',
        paymentDetails: null,
        total: d(20),
        debtOffset: d(5),
      }),
    ]);
    const r = await service.generate(user, 'methods', query);
    expect(r.rows).toEqual([
      ['DINHEIRO', 1, '30.00', '27.27'],
      ['PIX', 2, '80.00', '72.73'],
    ]);
    expect(r.totals).toMatchObject({ 'Atribuído às modalidades': '110.00' });
  });
  it('calcula principal líquido de juros/descontos e identifica pagamento parcial', async () => {
    const { tx, service } = setup();
    tx.contaReceber.findMany.mockResolvedValue([
      {
        id: 't',
        tenantName: 'Cliente',
        createdAt: new Date('2026-11-01T12:00:00Z'),
        issueDate: null,
        dueDate: new Date('2099-11-02T12:00:00Z'),
        amount: d(100),
        payments: [{ amountPaid: d(30), discount: d(5), interest: d(2) }],
      },
    ]);
    const r = await service.generate(user, 'receivables', query);
    expect(r.rows[0].slice(4, 8)).toEqual([
      '100.00',
      '33.00',
      '67.00',
      'PARCIAL',
    ]);
  });
  it('reconstrói estoque e separa movimentos posteriores ao período', async () => {
    const { tx, service } = setup();
    tx.salesProduct.findMany.mockResolvedValue([
      { id: 'p', name: 'Produto', sku: '1', stock: d(12) },
    ]);
    tx.salesStockMovement.findMany.mockResolvedValue([
      { productId: 'p', createdAt: new Date('2026-11-02'), stockChange: d(5) },
      { productId: 'p', createdAt: new Date('2026-11-03'), stockChange: d(-2) },
      { productId: 'p', createdAt: new Date('2026-11-20'), stockChange: d(4) },
    ]);
    expect((await service.generate(user, 'stock-balance', query)).rows).toEqual(
      [['1', 'Produto', '5', '5', '2', '8']],
    );
  });
  it('reconstrói saldos bancários com taxa de transferência sem duplicar outras fontes', async () => {
    const { tx, service } = setup();
    tx.bankAccount.findMany.mockResolvedValue([
      { id: 'a', name: 'Conta', currentBalance: d(137) },
    ]);
    tx.bankTransaction.findMany.mockResolvedValue([
      {
        bankAccountId: 'a',
        type: 'INFLOW',
        amount: d(50),
        fee: d(0),
        paymentDate: new Date('2026-11-02'),
        competenceDate: new Date('2026-11-02'),
      },
      {
        bankAccountId: 'a',
        type: 'OUTFLOW',
        amount: d(10),
        fee: d(3),
        paymentDate: new Date('2026-11-03'),
        competenceDate: new Date('2026-11-03'),
      },
    ]);
    expect((await service.generate(user, 'trial-balance', query)).rows).toEqual(
      [['Conta', '100.00', '50.00', '13.00', '137.00']],
    );
    expect(tx.salesOrder.findMany).not.toHaveBeenCalled();
    expect(tx.pagamentoRecebido.findMany).not.toHaveBeenCalled();
  });
  it('pagina visualização e exporta todas as linhas com autorização própria', async () => {
    const { tx, service } = setup();
    tx.salesOrder.findMany.mockResolvedValue(
      Array.from({ length: 101 }, (_, n) =>
        order({ id: String(n), number: n }),
      ),
    );
    const page = await service.generate(user, 'sales-detail', {
      ...query,
      page: 3,
    });
    expect(page.count).toBe(101);
    expect(page.rows).toHaveLength(1);
    expect(
      (
        await service.generate(user, 'sales-detail', {
          ...query,
          action: 'export',
        })
      ).rows,
    ).toHaveLength(101);
    tx.salesOrder.findMany.mockResolvedValue(
      Array.from({ length: 20001 }, () => order()),
    );
    await expect(
      service.generate(user, 'sellers', query),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('não substitui custo histórico ausente pelo cadastro atual e aplica filtros combinados', async () => {
    const { tx, service } = setup();
    tx.salesOrder.findMany.mockResolvedValue([order()]);
    tx.salesProduct.findMany.mockResolvedValue([
      { id: 'p', purchaseCost: d(1) },
    ]);
    const r = await service.generate(user, 'products', {
      ...query,
      product: 'Prod',
      brand: 'Marca',
      category: 'Cat',
      seller: 'Vend',
      customer: 'Cli',
      minimum: 50,
      maximum: 100,
    });
    expect(r.rows[0].slice(-2)).toEqual([null, null]);
    expect(r.rows[0][6]).toBe('90.00');
    expect(tx.salesProduct.findMany.mock.calls[0][0].where).toMatchObject({
      companyId: 'empresa-a',
      brand: 'Marca',
      category: 'Cat',
    });
    expect(tx.salesOrder.findMany.mock.calls[0][0].where).toMatchObject({
      companyId: 'empresa-a',
      status: 'CONCLUIDA',
    });
  });
  it('deduz devolução efetiva de produto mesmo sem novos itens de saída', async () => {
    const { tx, service } = setup();
    tx.salesOrder.findMany.mockResolvedValue([
      order({
        items: [],
        returnedItems: [
          {
            productId: 'p',
            name: 'Produto',
            sku: '001',
            quantity: 1,
            unitPrice: '50',
            subtotal: '100',
          },
        ],
        subtotal: d(0),
        discount: d(0),
        total: d(-45),
        returnTotal: d(45),
        paymentDetails: null,
      }),
    ]);
    tx.salesProduct.findMany.mockResolvedValue([{ id: 'p' }]);
    const result = await service.generate(user, 'products', {
      ...query,
      product: 'Produto',
    });
    expect(result.rows[0].slice(2, 7)).toEqual([
      '-1',
      '0.00',
      '0.00',
      '45.00',
      '-45.00',
    ]);
    expect((await service.generate(user, 'abc', query)).rows).toEqual([]);
  });
  it('exige permissões de todas as fontes da projeção', async () => {
    const { service, prisma } = setup();
    const limited = {
      ...user,
      role: 'USER',
      permissions: ['bank'],
      actionPermissions: ['bank:view'],
    };
    expect(
      service.catalog(limited).some((r) => r.id === 'projected-flow'),
    ).toBe(false);
    await expect(
      service.generate(limited, 'projected-flow', query),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
