/**
 * Property-based tests for commission calculation utility.
 * 
 * **Feature: employee-sales-recording**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateCommission, CommissionInput } from '../lib/commission';

// Arbitraries for generating test data
// Using Math.fround to ensure 32-bit float compatibility with fast-check
const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true });
const percentageArb = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true });
const fixedCommissionArb = fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true });

/**
 * **Feature: employee-sales-recording, Property 2: Percentage commission calculation**
 * 
 * *For any* sale amount and employee with commission_type "percentage", 
 * the calculated commission SHALL equal `sale_amount × commission_percentage / 100`, 
 * and house_amount SHALL equal `sale_amount - commission`.
 * 
 * **Validates: Requirements 2.2**
 */
describe('Property 2: Percentage commission calculation', () => {
  it('commission equals sale_amount × commission_percentage / 100', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        percentageArb,
        fixedCommissionArb,
        (saleAmount, commissionPercentage, fixedCommission) => {
          const input: CommissionInput = {
            saleAmount,
            commissionType: 'percentage',
            commissionPercentage,
            fixedCommission,
          };

          const result = calculateCommission(input);
          const expectedCommission = (saleAmount * commissionPercentage) / 100;

          // Commission should equal sale_amount × commission_percentage / 100
          expect(result.commission).toBeCloseTo(expectedCommission, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('house_amount equals sale_amount - commission for percentage type', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        percentageArb,
        fixedCommissionArb,
        (saleAmount, commissionPercentage, fixedCommission) => {
          const input: CommissionInput = {
            saleAmount,
            commissionType: 'percentage',
            commissionPercentage,
            fixedCommission,
          };

          const result = calculateCommission(input);
          const expectedHouseAmount = saleAmount - result.commission;

          // House amount should equal sale_amount - commission
          expect(result.houseAmount).toBeCloseTo(expectedHouseAmount, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: employee-sales-recording, Property 3: Fixed commission calculation**
 * 
 * *For any* sale amount and employee with commission_type "fixed", 
 * the calculated commission SHALL equal the employee's fixed_commission value 
 * regardless of sale amount, and house_amount SHALL equal `sale_amount - fixed_commission`.
 * 
 * **Validates: Requirements 2.3**
 */
describe('Property 3: Fixed commission calculation', () => {
  it('commission equals fixed_commission regardless of sale amount', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        percentageArb,
        fixedCommissionArb,
        (saleAmount, commissionPercentage, fixedCommission) => {
          const input: CommissionInput = {
            saleAmount,
            commissionType: 'fixed',
            commissionPercentage,
            fixedCommission,
          };

          const result = calculateCommission(input);

          // Commission should equal fixed_commission regardless of sale amount
          expect(result.commission).toBeCloseTo(fixedCommission, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('house_amount equals sale_amount - fixed_commission for fixed type', () => {
    fc.assert(
      fc.property(
        positiveAmountArb,
        percentageArb,
        fixedCommissionArb,
        (saleAmount, commissionPercentage, fixedCommission) => {
          const input: CommissionInput = {
            saleAmount,
            commissionType: 'fixed',
            commissionPercentage,
            fixedCommission,
          };

          const result = calculateCommission(input);
          const expectedHouseAmount = saleAmount - fixedCommission;

          // House amount should equal sale_amount - fixed_commission
          expect(result.houseAmount).toBeCloseTo(expectedHouseAmount, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
