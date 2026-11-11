import { orderListFilters } from './order-list-filter';
import { VendasService } from './vendas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Filtros das listas de vendas', () => {
  it('inclui todo o dia final no horário de Manaus', () => {
    expect(orderListFilters('', '2026-11-01', '2026-11-11').createdAt).toEqual({
      gte: new Date('2026-11-01T04:00:00Z'),
      lt: new Date('2026-11-12T04:00:00Z'),
    });
  });
  it.each(['2026-02-30', '2026-13-01', '11/11/2026', 'x'])(
    'rejeita data inválida %s',
    (date) => {
      expect(() => orderListFilters('', date)).toThrow('Data inválida');
    },
  );
  it('rejeita intervalo invertido e situação desconhecida', () => {
    expect(() => orderListFilters('', '2026-11-12', '2026-11-11')).toThrow(
      'data inicial',
    );
    expect(() => orderListFilters('', '', '', 'OUTRA')).toThrow(
      'Situação inválida',
    );
  });
  it('combina termos de cliente e vendedor e aceita número com # e espaços', () => {
    expect(orderListFilters('  # 146 ').AND).toEqual([
      {
        OR: [
          { customerName: { contains: '146', mode: 'insensitive' } },
          { sellerName: { contains: '146', mode: 'insensitive' } },
          { number: 146 },
        ],
      },
    ]);
    expect(orderListFilters('Ana   Maria').AND).toHaveLength(2);
  });
  it.each(['ORCAMENTO', 'CONDICIONAL', 'ATIVAS', 'GRAVADAS'])(
    'mantém empresa, categoria e cursor junto dos filtros: %s',
    async (filter) => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = new VendasService({
        appSettings: {
          findUnique: jest.fn().mockResolvedValue({
            companySettings: { ramoAtividade: 'CONFECCOES' },
          }),
        },
        salesOrder: { findMany },
      } as unknown as PrismaService);
      await service.listOrders(
        'empresa-a',
        '200',
        'Ana',
        filter,
        '2026-11-01',
        '2026-11-11',
        'CONCLUIDA',
      );
      const query = findMany.mock.calls[0][0];
      expect(query.where.companyId).toBe('empresa-a');
      expect(query.where.number).toEqual({ lt: 200 });
      expect(query.where.AND[0]).toEqual({ status: 'CONCLUIDA' });
      expect(query.where.createdAt.lt).toEqual(
        new Date('2026-11-12T04:00:00Z'),
      );
      expect(query.take).toBe(100);
      if (filter === 'ATIVAS') expect(query.where.status).toBe('EM_ANDAMENTO');
      else if (filter === 'GRAVADAS')
        expect(query.where.saleType).toEqual({ in: ['VENDA', 'TROCA'] });
      else expect(query.where.saleType).toBe(filter);
    },
  );
});
