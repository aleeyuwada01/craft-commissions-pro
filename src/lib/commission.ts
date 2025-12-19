/**
 * Commission calculation utility for employee sales recording.
 * Implements pure functions for calculating commission and house amounts.
 */

export interface CommissionInput {
  saleAmount: number;
  commissionType: 'percentage' | 'fixed';
  commissionPercentage: number;
  fixedCommission: number;
}

export interface CommissionResult {
  commission: number;
  houseAmount: number;
}

/**
 * Calculates commission and house amount based on sale amount and commission settings.
 * 
 * For percentage type: commission = saleAmount × commissionPercentage / 100
 * For fixed type: commission = fixedCommission (regardless of sale amount)
 * House amount = saleAmount - commission
 * 
 * @param input - Commission calculation parameters
 * @returns Object containing calculated commission and house amount
 */
export function calculateCommission(input: CommissionInput): CommissionResult {
  const { saleAmount, commissionType, commissionPercentage, fixedCommission } = input;

  let commission: number;

  if (commissionType === 'percentage') {
    commission = (saleAmount * commissionPercentage) / 100;
  } else {
    commission = fixedCommission;
  }

  const houseAmount = saleAmount - commission;

  return {
    commission,
    houseAmount,
  };
}
