import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CardPaymentDto, CriarVendaDto } from './dto/criar-venda.dto';
import { administratorsFromSettings } from './cartoes.controller';

export async function validateCardPayments(
  tx: Prisma.TransactionClient,
  companyId: string,
  data: CriarVendaDto,
  order: {
    total: Prisma.Decimal;
    paymentMethod: string;
    paymentDetails: Prisma.JsonValue | null;
    status?: string;
    saleType?: string;
  },
) {
  if (!data.cardPayments?.length) return [];
  const settings = await tx.appSettings.findUnique({ where: { companyId } });
  const admins = administratorsFromSettings(settings?.companySettings);
  const seen = new Set<string>();
  return data.cardPayments.map((payment: CardPaymentDto) => {
    const admin = payment.administratorId
      ? admins.find((item) => item.id === payment.administratorId)
      : undefined;
    const expected =
      order.paymentMethod === 'MISTO'
        ? new Prisma.Decimal(
            Number(
              (order.paymentDetails as Record<string, number> | null)?.[
                payment.method
              ] || 0,
            ),
          )
        : order.paymentMethod === payment.method
          ? order.total.abs()
          : new Prisma.Decimal(0);
    if (
      (payment.administratorId && !admin) ||
      seen.has(payment.method) ||
      expected.lte(0) ||
      !expected.eq(payment.amount) ||
      (payment.method === 'CARTAO_DEBITO' && payment.installments !== 1)
    )
      throw new BadRequestException(
        'Confira a administradora, o valor e as parcelas do cartão.',
      );
    seen.add(payment.method);
    return {
      method: payment.method,
      administratorId: admin?.id || null,
      administratorName: admin?.name || null,
      brand: payment.brand?.trim() || null,
      lastFour: payment.lastFour || null,
      holderName: payment.holderName?.trim() || null,
      nsu: payment.nsu?.trim() || null,
      authorizationCode: payment.authorizationCode?.trim() || null,
      installments: payment.installments,
      amount: payment.amount,
    };
  });
}
