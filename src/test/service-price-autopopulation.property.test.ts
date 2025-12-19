/**
 * Property-based tests for service price auto-population.
 * 
 * **Feature: employee-sales-recording**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getServicePrice } from '../components/SaleRecordDialog';
import { Service } from '../hooks/useServices';

// Arbitrary for generating valid ISO date strings
const validDateArb = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(timestamp => new Date(timestamp).toISOString());

// Arbitrary for generating a valid service
const serviceArb = fc.record({
  id: fc.uuid(),
  business_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  base_price: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
  is_active: fc.boolean(),
  description: fc.option(fc.string(), { nil: null }),
  created_at: validDateArb,
  updated_at: validDateArb,
});

// Arbitrary for generating a list of services
const servicesListArb = fc.array(serviceArb, { minLength: 1, maxLength: 20 });

/**
 * **Feature: employee-sales-recording, Property 1: Service price auto-population**
 * 
 * *For any* service selected from the dropdown, the sale amount field 
 * SHALL be populated with that service's base_price value.
 * 
 * **Validates: Requirements 1.2**
 */
describe('Property 1: Service price auto-population', () => {
  it('returns the base_price of the selected service', () => {
    fc.assert(
      fc.property(
        servicesListArb,
        (services) => {
          // Pick a random service from the list
          const randomIndex = Math.floor(Math.random() * services.length);
          const selectedService = services[randomIndex];

          const result = getServicePrice(services, selectedService.id);

          // The returned price should equal the service's base_price
          expect(result).toBe(selectedService.base_price);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null when service is not found', () => {
    fc.assert(
      fc.property(
        servicesListArb,
        fc.uuid(),
        (services, nonExistentId) => {
          // Ensure the generated ID doesn't exist in the services list
          const existingIds = new Set(services.map(s => s.id));
          if (existingIds.has(nonExistentId)) {
            return true; // Skip this case
          }

          const result = getServicePrice(services, nonExistentId);

          // Should return null for non-existent service
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns correct price regardless of service position in list', () => {
    fc.assert(
      fc.property(
        servicesListArb,
        fc.nat({ max: 100 }),
        (services, seed) => {
          // Select service at different positions
          const index = seed % services.length;
          const selectedService = services[index];

          const result = getServicePrice(services, selectedService.id);

          // Price should match regardless of position
          expect(result).toBe(selectedService.base_price);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for empty services list', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (serviceId) => {
          const emptyServices: Service[] = [];
          const result = getServicePrice(emptyServices, serviceId);

          // Should return null for empty list
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
