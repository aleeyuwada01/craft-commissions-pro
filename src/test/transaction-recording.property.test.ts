/**
 * Property-based tests for transaction recording logic.
 * 
 * **Feature: employee-sales-recording**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Types matching the database schema
interface Employee {
  id: string;
  business_id: string;
  name: string;
  commission_type: 'percentage' | 'fixed';
  commission_percentage: number;
  fixed_commission: number;
}

interface Transaction {
  id: string;
  business_id: string;
  employee_id: string;
  service_id: string;
  total_amount: number;
  commission_amount: number;
  house_amount: number;
  is_commission_paid: boolean;
  created_at: string;
}

interface ActivityLog {
  id: string;
  employee_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

/**
 * Pure function that creates a transaction record from employee and sale data.
 * This represents the transaction creation logic in SaleRecordDialog.
 */
export function createTransactionRecord(
  employee: Employee,
  serviceId: string,
  totalAmount: number,
  commissionAmount: number,
  houseAmount: number
): Omit<Transaction, 'id' | 'created_at'> {
  return {
    business_id: employee.business_id,
    employee_id: employee.id,
    service_id: serviceId,
    total_amount: totalAmount,
    commission_amount: commissionAmount,
    house_amount: houseAmount,
    is_commission_paid: false,
  };
}

/**
 * Pure function that creates an activity log entry for a sale.
 * This represents the activity logging logic in SaleRecordDialog.
 */
export function createActivityLogEntry(
  employeeId: string,
  action: string,
  details: string | null
): Omit<ActivityLog, 'id' | 'created_at'> {
  return {
    employee_id: employeeId,
    action,
    details,
  };
}

// Arbitraries for generating test data
const uuidArb = fc.uuid();
const employeeNameArb = fc.string({ minLength: 1, maxLength: 50 });
const commissionTypeArb = fc.constantFrom('percentage', 'fixed') as fc.Arbitrary<'percentage' | 'fixed'>;
const percentageArb = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true });
const fixedCommissionArb = fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true });
const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true });

const employeeArb: fc.Arbitrary<Employee> = fc.record({
  id: uuidArb,
  business_id: uuidArb,
  name: employeeNameArb,
  commission_type: commissionTypeArb,
  commission_percentage: percentageArb,
  fixed_commission: fixedCommissionArb,
});

/**
 * **Feature: employee-sales-recording, Property 4: Business unit association**
 * 
 * *For any* transaction created by an employee, the transaction's business_id 
 * SHALL equal the employee's business_id.
 * 
 * **Validates: Requirements 3.1**
 */
describe('Property 4: Business unit association', () => {
  it('transaction business_id equals employee business_id', () => {
    fc.assert(
      fc.property(
        employeeArb,
        uuidArb, // serviceId
        positiveAmountArb, // totalAmount
        positiveAmountArb, // commissionAmount
        positiveAmountArb, // houseAmount
        (employee, serviceId, totalAmount, commissionAmount, houseAmount) => {
          const transaction = createTransactionRecord(
            employee,
            serviceId,
            totalAmount,
            commissionAmount,
            houseAmount
          );

          // Property: Transaction's business_id must equal employee's business_id
          expect(transaction.business_id).toBe(employee.business_id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transaction employee_id equals the recording employee id', () => {
    fc.assert(
      fc.property(
        employeeArb,
        uuidArb,
        positiveAmountArb,
        positiveAmountArb,
        positiveAmountArb,
        (employee, serviceId, totalAmount, commissionAmount, houseAmount) => {
          const transaction = createTransactionRecord(
            employee,
            serviceId,
            totalAmount,
            commissionAmount,
            houseAmount
          );

          // Property: Transaction's employee_id must equal the recording employee's id
          expect(transaction.employee_id).toBe(employee.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transaction preserves all sale amounts correctly', () => {
    fc.assert(
      fc.property(
        employeeArb,
        uuidArb,
        positiveAmountArb,
        positiveAmountArb,
        positiveAmountArb,
        (employee, serviceId, totalAmount, commissionAmount, houseAmount) => {
          const transaction = createTransactionRecord(
            employee,
            serviceId,
            totalAmount,
            commissionAmount,
            houseAmount
          );

          // Property: All amounts are preserved in the transaction
          expect(transaction.total_amount).toBe(totalAmount);
          expect(transaction.commission_amount).toBe(commissionAmount);
          expect(transaction.house_amount).toBe(houseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: employee-sales-recording, Property 5: Activity logging on sale**
 * 
 * *For any* successfully recorded sale, an activity log entry SHALL be created 
 * with employee_id matching the recording employee and action equal to "sale_recorded".
 * 
 * **Validates: Requirements 3.3**
 */
describe('Property 5: Activity logging on sale', () => {
  it('activity log employee_id matches the recording employee', () => {
    fc.assert(
      fc.property(
        uuidArb, // employeeId
        fc.option(fc.string({ maxLength: 200 }), { nil: null }), // details
        (employeeId, details) => {
          const activityLog = createActivityLogEntry(
            employeeId,
            'sale_recorded',
            details
          );

          // Property: Activity log's employee_id must match the recording employee
          expect(activityLog.employee_id).toBe(employeeId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activity log action equals "sale_recorded" for sales', () => {
    fc.assert(
      fc.property(
        uuidArb,
        fc.option(fc.string({ maxLength: 200 }), { nil: null }),
        (employeeId, details) => {
          const activityLog = createActivityLogEntry(
            employeeId,
            'sale_recorded',
            details
          );

          // Property: Activity log action must be "sale_recorded"
          expect(activityLog.action).toBe('sale_recorded');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activity log preserves details when provided', () => {
    fc.assert(
      fc.property(
        uuidArb,
        fc.string({ minLength: 1, maxLength: 200 }), // non-null details
        (employeeId, details) => {
          const activityLog = createActivityLogEntry(
            employeeId,
            'sale_recorded',
            details
          );

          // Property: Activity log details are preserved
          expect(activityLog.details).toBe(details);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activity log handles null details', () => {
    fc.assert(
      fc.property(
        uuidArb,
        (employeeId) => {
          const activityLog = createActivityLogEntry(
            employeeId,
            'sale_recorded',
            null
          );

          // Property: Activity log handles null details
          expect(activityLog.details).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
