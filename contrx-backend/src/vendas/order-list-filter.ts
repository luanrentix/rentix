import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function orderListFilters(
  search?: string,
  startDate?: string,
  endDate?: string,
  status?: string,
): Prisma.SalesOrderWhereInput {
  const date = (value: string) => {
    const parsed = new Date(`${value}T00:00:00-04:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      new Date(parsed.getTime() - 4 * 3600000).toISOString().slice(0, 10) !==
        value
    )
      throw new BadRequestException('Data inválida.');
    return parsed;
  };
  const start = startDate ? date(startDate) : undefined;
  const end = endDate ? date(endDate) : undefined;
  if (start && end && start > end)
    throw new BadRequestException(
      'A data inicial deve ser anterior ou igual à final.',
    );
  if (
    status &&
    !['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'ESTORNADA'].includes(status)
  )
    throw new BadRequestException('Situação inválida.');
  const term = (search || '').trim().replace(/^#\s*/, '').slice(0, 120);
  return {
    ...(start || end
      ? {
          createdAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lt: new Date(end.getTime() + 86400000) } : {}),
          },
        }
      : {}),
    AND: [
      ...(status ? [{ status }] : []),
      ...term
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => ({
          OR: [
            { customerName: { contains: token, mode: 'insensitive' as const } },
            { sellerName: { contains: token, mode: 'insensitive' as const } },
            ...(/^\d+$/.test(token) && Number.isSafeInteger(Number(token))
              ? [{ number: Number(token) }]
              : []),
          ],
        })),
    ],
  };
}
