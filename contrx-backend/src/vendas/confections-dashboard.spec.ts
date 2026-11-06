import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfectionsDashboardService,
  localDate,
  localMidnight,
} from './confections-dashboard.service';

describe('Inicio de confeccoes', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T15:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const decimal = (value: number) => new Prisma.Decimal(value);
  function fixture() {
    const db = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: {
            ramoAtividade: 'CONFECCOES',
            city: 'Manaus',
            state: 'AM',
            tradeName: 'LOJA',
          },
        }),
      },
      salesOrder: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: { total: decimal(300) },
            _count: { _all: 2 },
          })
          .mockResolvedValueOnce({
            _sum: { total: decimal(100) },
            _count: { _all: 1 },
          })
          .mockResolvedValueOnce({
            _sum: { total: decimal(1500) },
            _count: { _all: 5 },
          }),
        findMany: jest.fn().mockResolvedValue([
          {
            items: [{ quantity: 2 }, { quantity: 3 }],
            returnedItems: [{ quantity: 1 }],
          },
        ]),
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(4),
      },
      contaReceber: { count: jest.fn().mockResolvedValue(5) },
      salesProduct: {
        findMany: jest.fn().mockResolvedValue([
          { stock: decimal(0), minimumStock: decimal(1) },
          { stock: decimal(5), minimumStock: decimal(0) },
        ]),
      },
    };
    return {
      db,
      service: new ConfectionsDashboardService(db as unknown as PrismaService),
    };
  }
  it('respeita o dia e a meia-noite do fuso da cidade', () => {
    expect(localDate(new Date('2026-11-07T02:00:00Z'), 'America/Manaus')).toBe(
      '2026-11-06',
    );
    expect(localMidnight('2026-11-06', 'America/Manaus').toISOString()).toBe(
      '2026-11-06T04:00:00.000Z',
    );
    expect(localMidnight('2026-11-06', 'America/Sao_Paulo').toISOString()).toBe(
      '2026-11-06T03:00:00.000Z',
    );
  });
  it('pesquisa municipios com acentos, UF e fuso horario', () => {
    const { service } = fixture();
    expect(service.searchCities('sao paulo SP')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'São Paulo',
          state: 'SP',
          timeZone: 'America/Sao_Paulo',
        }),
      ]),
    );
    expect(service.searchCities('Rolim de Moura')[0]).toMatchObject({
      state: 'RO',
      timeZone: 'America/Porto_Velho',
    });
  });
  it('calcula resumo real, desconta devolucoes e usa a empresa autenticada em todas as consultas', async () => {
    const { db, service } = fixture();
    const result = await service.overview('empresa-A');
    expect(result).toMatchObject({
      date: '2026-11-06',
      selectedCity: { name: 'Manaus', state: 'AM' },
      daily: {
        revenue: 300,
        sales: 2,
        items: 4,
        average: 150,
        revenueChange: 200,
      },
      monthly: { revenue: 1500, sales: 5 },
      pending: { conditionals: 3, orders: 4, overdue: 5, lowStock: 1 },
    });
    for (const delegate of [
      db.salesOrder.aggregate,
      db.salesOrder.findMany,
      db.salesOrder.count,
      db.contaReceber.count,
      db.salesProduct.findMany,
    ]) {
      for (const [args] of delegate.mock.calls as unknown as [
        { where: { companyId: string } },
      ][])
        expect(args.where.companyId).toBe('empresa-A');
    }
    expect(db.salesOrder.aggregate.mock.calls[0][0].where).toMatchObject({
      status: 'CONCLUIDA',
      saleType: { in: ['VENDA', 'TROCA'] },
      OR: [
        {
          completedAt: {
            gte: new Date('2026-11-06T04:00:00Z'),
            lt: new Date('2026-11-07T04:00:00Z'),
          },
        },
        expect.any(Object),
      ],
    });
  });
  it('nao expoe painel de confeccoes para outro ramo', async () => {
    const { db, service } = fixture();
    db.appSettings.findUnique.mockResolvedValue({
      companySettings: { ramoAtividade: 'LOCACAO' },
    });
    await expect(service.overview('empresa-A')).rejects.toThrow('confecções');
    expect(db.salesOrder.aggregate).not.toHaveBeenCalled();
  });
  it('rejeita localizacao ou fuso invalidos', async () => {
    const { db, service } = fixture();
    await expect(service.weather('invalid')).rejects.toThrow('cidade válida');
    db.appSettings.findUnique.mockResolvedValue({
      companySettings: { ramoAtividade: 'CONFECCOES' },
    });
    await expect(
      service.overview('A', undefined, 'http://invalid'),
    ).rejects.toThrow('Fuso horário');
  });
  it('consulta o clima real e reutiliza a previsao em cache', async () => {
    const { service } = fixture();
    const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        properties: {
          meta: { updated_at: '2026-11-06T12:00:00Z' },
          timeseries: [
            {
              time: '2026-11-06T15:00:00Z',
              data: {
                instant: {
                  details: { air_temperature: 32, relative_humidity: 70 },
                },
                next_1_hours: {
                  summary: { symbol_code: 'rainshowers_day' },
                  details: { precipitation_amount: 2 },
                },
              },
            },
          ],
        },
      }),
    );
    const first = await service.weather('1302603');
    expect(first).toMatchObject({
      city: { name: 'Manaus' },
      temperature: 32,
      feelsLike: null,
      symbol: 'rainshowers_day',
      precipitation: 2,
    });
    await service.weather('1302603');
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0] as string)).toMatch(
      /^https:\/\/api\.met\.no\/weatherapi\/locationforecast\/2\.0\/compact\?lat=/,
    );
  });
  it('retorna falha explicita em vez de inventar temperatura quando o provedor cai', async () => {
    const { service } = fixture();
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(service.weather('1302603')).rejects.toThrow('indisponível');
  });
});
