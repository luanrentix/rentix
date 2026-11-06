import { orderOrigin } from './order-history';
const item = (quantity: number) => [{ productId: 'product', quantity }];
describe('Histórico de orçamento e condicional', () => {
  it('mantém origem do orçamento após conversão sem presumir histórico ausente', () => {
    const order = {
      saleType: 'VENDA',
      status: 'CONCLUIDA',
      stockReserved: false,
      items: item(2),
    };
    expect(
      orderOrigin(order, [
        { details: { saleType: 'VENDA' } },
        { details: { saleType: 'ORCAMENTO' } },
      ]).originType,
    ).toBe('ORCAMENTO');
    expect(orderOrigin(order, []).originType).toBe('VENDA');
  });
  it('separa enviado, devolvido, vendido e pendente em snapshots de reserva', () => {
    const history = [
      { details: { items: item(2), stockReserved: false, saleType: 'VENDA' } },
      { details: { items: item(3), stockReserved: true } },
      { details: { items: item(5), stockReserved: true } },
    ];
    expect(
      orderOrigin(
        {
          saleType: 'VENDA',
          status: 'CONCLUIDA',
          stockReserved: false,
          items: item(2),
        },
        history,
      ),
    ).toEqual({
      originType: 'CONDICIONAL',
      conditionalSummary: { sent: 5, returned: 3, sold: 2, pending: 0 },
    });
  });
  it('libera integralmente a quantidade pendente de condicional cancelado', () => {
    const history = [{ details: { items: item(5), stockReserved: true } }];
    expect(
      orderOrigin(
        {
          saleType: 'CONDICIONAL',
          status: 'CANCELADA',
          stockReserved: false,
          items: item(5),
        },
        history,
      ).conditionalSummary,
    ).toEqual({ sent: 5, returned: 5, sold: 0, pending: 0 });
  });
});
