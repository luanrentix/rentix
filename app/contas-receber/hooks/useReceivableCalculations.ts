import { useCallback } from "react";
import { Charge, ChargePayment } from "../printing";

export function useReceivableCalculations(paymentRecords: ChargePayment[]) {
  const getChargePayments = useCallback((chargeId: string) => {
    return paymentRecords
      .filter(
        (paymentRecord) => String(paymentRecord.chargeId) === String(chargeId),
      )
      .sort(
        (firstPayment, secondPayment) =>
          new Date(secondPayment.paidAt).getTime() -
          new Date(firstPayment.paidAt).getTime(),
      );
  }, [paymentRecords]);

  const getChargePayment = useCallback((chargeId: string) => {
    return getChargePayments(chargeId)[0];
  }, [getChargePayments]);

  const getChargePaidAmount = useCallback((charge: Charge) => {
    const backendPaidAmount = Number(charge.paidAmount || 0);

    if (backendPaidAmount > 0) return backendPaidAmount;

    return getChargePayments(charge.id).reduce(
      (total, paymentRecord) => total + paymentRecord.amountPaid,
      0,
    );
  }, [getChargePayments]);

  const getChargeSettlementAmount = useCallback((charge: Charge) => {
    return getChargePayments(charge.id).reduce((total, paymentRecord) => {
      return (
        total +
        paymentRecord.amountPaid +
        paymentRecord.discount -
        paymentRecord.interest
      );
    }, 0);
  }, [getChargePayments]);

  const getChargeRemainingAmount = useCallback((charge: Charge) => {
    if (typeof charge.remainingAmount === "number") {
      return Math.max(charge.remainingAmount, 0);
    }

    return Math.max(charge.amount - getChargeSettlementAmount(charge), 0);
  }, [getChargeSettlementAmount]);

  return {
    getChargePayments,
    getChargePayment,
    getChargePaidAmount,
    getChargeSettlementAmount,
    getChargeRemainingAmount,
  };
}
