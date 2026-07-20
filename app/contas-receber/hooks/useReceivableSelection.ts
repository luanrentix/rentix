import { useState, useCallback } from "react";

export function useReceivableSelection(selectableChargeIds: string[]) {
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);

  const toggleChargeSelection = useCallback((chargeId: string) => {
    setSelectedChargeIds((currentChargeIds) =>
      currentChargeIds.includes(chargeId)
        ? currentChargeIds.filter((currentChargeId) => currentChargeId !== chargeId)
        : [...currentChargeIds, chargeId],
    );
  }, []);

  const toggleAllVisibleChargeSelection = useCallback(() => {
    const allVisibleSelected =
      selectableChargeIds.length > 0 &&
      selectableChargeIds.every((chargeId) => selectedChargeIds.includes(chargeId));

    if (allVisibleSelected) {
      setSelectedChargeIds((currentChargeIds) =>
        currentChargeIds.filter(
          (currentChargeId) => !selectableChargeIds.includes(currentChargeId),
        ),
      );
      return;
    }

    setSelectedChargeIds((currentChargeIds) =>
      Array.from(new Set([...currentChargeIds, ...selectableChargeIds])),
    );
  }, [selectableChargeIds, selectedChargeIds]);

  const clearChargeSelection = useCallback(() => {
    setSelectedChargeIds([]);
  }, []);

  const allVisibleChargesSelected =
    selectableChargeIds.length > 0 &&
    selectableChargeIds.every((chargeId) => selectedChargeIds.includes(chargeId));

  return {
    selectedChargeIds,
    setSelectedChargeIds,
    toggleChargeSelection,
    toggleAllVisibleChargeSelection,
    clearChargeSelection,
    allVisibleChargesSelected,
  };
}
