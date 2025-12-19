/**
 * Property-based tests for service filtering logic.
 * 
 * **Feature: employee-sales-recording**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Service type matching the database schema
interface Service {
  id: string;
  business_id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Pure function that filters services by business_id and is_active status.
 * This represents the filtering logic that the useServices hook applies via Supabase query.
 */
export function filterServicesForBusiness(
  services: Service[],
  businessId: string
): Service[] {
  return services.filter(
    (service) => service.business_id === businessId && service.is_active === true
  );
}

// Arbitraries for generating test data
const businessIdArb = fc.uuid();
const serviceIdArb = fc.uuid();
const serviceNameArb = fc.string({ minLength: 1, maxLength: 50 });
const basePriceArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true });
const descriptionArb = fc.option(fc.string({ maxLength: 200 }), { nil: null });
const dateStringArb = fc.constant('2024-01-01T00:00:00.000Z');

const serviceArb = (businessIdOptions: string[]): fc.Arbitrary<Service> =>
  fc.record({
    id: serviceIdArb,
    business_id: fc.constantFrom(...businessIdOptions),
    name: serviceNameArb,
    base_price: basePriceArb,
    is_active: fc.boolean(),
    description: descriptionArb,
    created_at: dateStringArb,
    updated_at: dateStringArb,
  });

/**
 * **Feature: employee-sales-recording, Property 6: Service filtering by business unit**
 * 
 * *For any* employee viewing the sale recording dialog, the services list SHALL contain 
 * only services where is_active is true AND business_id equals the employee's business_id.
 * 
 * **Validates: Requirements 4.1**
 */
describe('Property 6: Service filtering by business unit', () => {
  it('filtered services contain only active services for the specified business', () => {
    fc.assert(
      fc.property(
        // Generate 2-4 business IDs to create a realistic scenario
        fc.array(businessIdArb, { minLength: 2, maxLength: 4 }),
        fc.nat({ max: 20 }), // Number of services to generate
        (businessIds, serviceCount) => {
          // Pre-condition: need at least 2 business IDs
          fc.pre(businessIds.length >= 2);

          // Generate services with random business_id from the pool
          const servicesArb = fc.array(serviceArb(businessIds), {
            minLength: serviceCount,
            maxLength: serviceCount,
          });

          return fc.assert(
            fc.property(servicesArb, (services) => {
              // Pick a target business ID to filter by
              const targetBusinessId = businessIds[0];

              const filteredServices = filterServicesForBusiness(
                services,
                targetBusinessId
              );

              // Property: All filtered services must have the target business_id
              const allMatchBusinessId = filteredServices.every(
                (s) => s.business_id === targetBusinessId
              );

              // Property: All filtered services must be active
              const allAreActive = filteredServices.every(
                (s) => s.is_active === true
              );

              // Property: No active service for target business should be excluded
              const expectedServices = services.filter(
                (s) => s.business_id === targetBusinessId && s.is_active === true
              );
              const noMissingServices =
                filteredServices.length === expectedServices.length;

              expect(allMatchBusinessId).toBe(true);
              expect(allAreActive).toBe(true);
              expect(noMissingServices).toBe(true);
            }),
            { numRuns: 1 } // Inner assertion runs once per outer iteration
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('excludes inactive services even if they belong to the target business', () => {
    fc.assert(
      fc.property(
        businessIdArb,
        fc.array(
          fc.record({
            id: serviceIdArb,
            business_id: fc.constant(''), // Will be overwritten
            name: serviceNameArb,
            base_price: basePriceArb,
            is_active: fc.boolean(),
            description: descriptionArb,
            created_at: dateStringArb,
            updated_at: dateStringArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (targetBusinessId, baseServices) => {
          // All services belong to the target business
          const services: Service[] = baseServices.map((s) => ({
            ...s,
            business_id: targetBusinessId,
          }));

          const filteredServices = filterServicesForBusiness(
            services,
            targetBusinessId
          );

          // Count inactive services in original list
          const inactiveCount = services.filter((s) => !s.is_active).length;
          const activeCount = services.filter((s) => s.is_active).length;

          // Filtered list should only contain active services
          expect(filteredServices.length).toBe(activeCount);
          expect(filteredServices.every((s) => s.is_active)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('excludes services from other business units', () => {
    fc.assert(
      fc.property(
        businessIdArb,
        businessIdArb,
        fc.array(
          fc.record({
            id: serviceIdArb,
            business_id: fc.constant(''), // Will be overwritten
            name: serviceNameArb,
            base_price: basePriceArb,
            is_active: fc.constant(true), // All active
            description: descriptionArb,
            created_at: dateStringArb,
            updated_at: dateStringArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (targetBusinessId, otherBusinessId, baseServices) => {
          // Pre-condition: business IDs must be different
          fc.pre(targetBusinessId !== otherBusinessId);

          // All services belong to the OTHER business
          const services: Service[] = baseServices.map((s) => ({
            ...s,
            business_id: otherBusinessId,
          }));

          const filteredServices = filterServicesForBusiness(
            services,
            targetBusinessId
          );

          // No services should be returned since none belong to target business
          expect(filteredServices.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
