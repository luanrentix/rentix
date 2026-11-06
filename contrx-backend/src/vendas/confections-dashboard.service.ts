import { scalarText } from '../common/text-normalization';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import cityData from './data/brazilian-cities.json';
const cities = cityData.cities;

export type DashboardCity = (typeof cities)[number];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function localDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (name: string) => parts.find((part) => part.type === name)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function localMidnight(date: string, timeZone: string) {
  const base = Date.parse(`${date}T00:00:00Z`);
  let guess = base;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const get = (name: string) =>
      parts.find((part) => part.type === name)!.value;
    const represented = Date.parse(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`,
    );
    guess += base - represented;
  }
  return new Date(guess);
}
const shiftDate = (value: string, days: number) =>
  new Date(Date.parse(`${value}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
type ForecastPoint = {
  time: string;
  data: {
    instant: { details: Record<string, number> };
    next_1_hours?: {
      summary: { symbol_code: string };
      details: Record<string, number>;
    };
    next_6_hours?: {
      summary: { symbol_code: string };
      details: Record<string, number>;
    };
  };
};
type Forecast = {
  properties: { meta: { updated_at: string }; timeseries: ForecastPoint[] };
};

@Injectable()
export class ConfectionsDashboardService {
  private forecasts = new Map<number, { until: number; value: Forecast }>();
  private pendingForecasts = new Map<number, Promise<Forecast>>();
  private lastWeatherRequest = 0;
  constructor(private readonly prisma: PrismaService) {}

  searchCities(query: string) {
    const term = normalize((query || '').trim()).slice(0, 100);
    if (term.length < 2) return [];
    return cities
      .filter((city) => normalize(`${city.name} ${city.state}`).includes(term))
      .sort(
        (a, b) =>
          Number(normalize(b.name) === term) -
            Number(normalize(a.name) === term) ||
          a.name.localeCompare(b.name, 'pt-BR'),
      )
      .slice(0, 25);
  }
  private city(id: string) {
    const city = cities.find((entry) => entry.id === Number(id));
    if (!city) throw new BadRequestException('Selecione uma cidade válida.');
    return city;
  }
  async weather(id: string) {
    const city = this.city(id);
    let forecast = this.forecasts.get(city.id)?.value;
    if (!forecast || this.forecasts.get(city.id)!.until < Date.now()) {
      let request = this.pendingForecasts.get(city.id);
      if (!request) {
        if (
          this.pendingForecasts.size >= 8 ||
          Date.now() - this.lastWeatherRequest < 100
        )
          throw new ServiceUnavailableException(
            'Aguarde um instante antes de consultar outra cidade.',
          );
        this.lastWeatherRequest = Date.now();
        request = (async () => {
          try {
            const response = await fetch(
              `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${city.latitude.toFixed(4)}&lon=${city.longitude.toFixed(4)}`,
              {
                headers: {
                  'User-Agent':
                    process.env.WEATHER_USER_AGENT ||
                    'Contrx/1.0 (company management dashboard)',
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(10000),
              },
            );
            if (!response.ok) throw new Error('Weather provider unavailable');
            const value = (await response.json()) as Forecast;
            if (
              !Array.isArray(value.properties?.timeseries) ||
              !value.properties.timeseries.length
            )
              throw new Error('Invalid forecast');
            if (this.forecasts.size >= 200)
              this.forecasts.delete(this.forecasts.keys().next().value);
            this.forecasts.set(city.id, {
              until: Date.now() + 3 * 60 * 60 * 1000,
              value,
            });
            return value;
          } finally {
            this.pendingForecasts.delete(city.id);
          }
        })();
        this.pendingForecasts.set(city.id, request);
      }
      try {
        forecast = await request;
      } catch {
        throw new ServiceUnavailableException(
          'A previsão do tempo está indisponível. Tente novamente em alguns minutos.',
        );
      }
    }
    const point = forecast.properties.timeseries.reduce((best, next) =>
      Math.abs(Date.parse(next.time) - Date.now()) <
      Math.abs(Date.parse(best.time) - Date.now())
        ? next
        : best,
    );
    const details = point.data.instant.details;
    const next = point.data.next_1_hours || point.data.next_6_hours;
    if (!Number.isFinite(details.air_temperature))
      throw new ServiceUnavailableException(
        'Previsão sem temperatura disponível.',
      );
    return {
      city,
      temperature: details.air_temperature,
      feelsLike: details.apparent_air_temperature ?? null,
      humidity: details.relative_humidity ?? null,
      symbol: next?.summary.symbol_code || 'cloudy',
      precipitation: next?.details.precipitation_amount ?? null,
      precipitationHours: point.data.next_1_hours ? 1 : 6,
      probability: next?.details.probability_of_precipitation ?? null,
      forecastAt: point.time,
      updatedAt: forecast.properties.meta.updated_at,
    };
  }

  async overview(companyId: string, cityId?: string, requestedZone?: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId },
      select: { companySettings: true },
    });
    const company = (settings?.companySettings || {}) as Record<
      string,
      unknown
    >;
    if (company.ramoAtividade !== 'CONFECCOES')
      throw new NotFoundException(
        'Painel disponível para empresas de confecções.',
      );
    const defaultCity =
      cities.find(
        (city) =>
          normalize(city.name) === normalize(scalarText(company.city || '')) &&
          (!company.state || city.state === company.state),
      ) || null;
    const city = cityId ? this.city(cityId) : defaultCity;
    const timeZone = city?.timeZone || requestedZone || 'America/Sao_Paulo';
    if (timeZone.length > 60)
      throw new BadRequestException('Fuso horário inválido.');
    let date: string;
    try {
      date = localDate(new Date(), timeZone);
    } catch {
      throw new BadRequestException('Fuso horário inválido.');
    }
    const today = localMidnight(date, timeZone),
      tomorrow = localMidnight(shiftDate(date, 1), timeZone);
    const yesterday = localMidnight(shiftDate(date, -1), timeZone),
      month = localMidnight(`${date.slice(0, 7)}-01`, timeZone);
    const ordersWhere = (
      start: Date,
      end: Date,
    ): Prisma.SalesOrderWhereInput => ({
      companyId,
      status: 'CONCLUIDA',
      saleType: { in: ['VENDA', 'TROCA'] },
      OR: [
        { completedAt: { gte: start, lt: end } },
        { completedAt: null, createdAt: { gte: start, lt: end } },
      ],
    });
    const aggregate = (start: Date, end: Date) =>
      this.prisma.salesOrder.aggregate({
        where: ordersWhere(start, end),
        _sum: { total: true },
        _count: { _all: true },
      });
    const [
      daily,
      previous,
      monthly,
      items,
      conditionals,
      pendingOrders,
      overdue,
      inventory,
    ] = await Promise.all([
      aggregate(today, tomorrow),
      aggregate(yesterday, today),
      aggregate(month, tomorrow),
      this.prisma.salesOrder.findMany({
        where: ordersWhere(today, tomorrow),
        select: { items: true, returnedItems: true },
      }),
      this.prisma.salesOrder.count({
        where: { companyId, status: 'EM_ANDAMENTO', saleType: 'CONDICIONAL' },
      }),
      this.prisma.salesOrder.count({
        where: {
          companyId,
          status: 'EM_ANDAMENTO',
          saleType: { in: ['PEDIDO', 'ORCAMENTO'] },
        },
      }),
      this.prisma.contaReceber.count({
        where: {
          companyId,
          cancelledAt: null,
          salesOrderId: { not: null },
          status: 'PENDING',
          dueDate: { lt: new Date(`${date}T00:00:00Z`) },
        },
      }),
      this.prisma.salesProduct.findMany({
        where: {
          companyId,
          active: true,
          isGridParent: false,
          manageStock: true,
        },
        select: { stock: true, minimumStock: true },
      }),
    ]);
    const quantity = (value: Prisma.JsonValue | null) =>
      Array.isArray(value)
        ? value.reduce<number>((total, entry) => {
            const n =
              entry && typeof entry === 'object' && !Array.isArray(entry)
                ? Number(entry.quantity || 0)
                : 0;
            return total + (Number.isFinite(n) ? n : 0);
          }, 0)
        : 0;
    const revenue = Number(daily._sum.total || 0),
      count = daily._count._all;
    return {
      date,
      timeZone,
      defaultCity,
      selectedCity: city,
      companyName: scalarText(
        company.tradeName || company.companyName || 'Sua loja',
      ),
      daily: {
        revenue,
        sales: count,
        items: items.reduce(
          (sum, order) =>
            sum + quantity(order.items) - quantity(order.returnedItems),
          0,
        ),
        average: count ? revenue / count : 0,
        revenueChange:
          Number(previous._sum.total) > 0
            ? ((revenue - Number(previous._sum.total)) /
                Number(previous._sum.total)) *
              100
            : null,
      },
      monthly: {
        revenue: Number(monthly._sum.total || 0),
        sales: monthly._count._all,
      },
      pending: {
        conditionals,
        orders: pendingOrders,
        overdue,
        lowStock: inventory.filter((product) =>
          product.stock.lte(product.minimumStock),
        ).length,
      },
    };
  }
}
