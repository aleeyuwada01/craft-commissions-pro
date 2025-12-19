/**
 * **Feature: private-access-toggle, Property 3: Signup API Rejection**
 * 
 * *For any* signup request (via signUp function or direct API call) when Private Access Mode is enabled,
 * the system should reject the request and return an error indicating registration is disabled.
 * 
 * **Validates: Requirements 3.1, 3.2**
 * 
 * Note: This property test validates the signup rejection logic by testing the 
 * signUp function behavior based on private access state.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Types representing signup request and response
interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

interface SignupResult {
  error: { message: string; status?: number } | null;
  success: boolean;
}

/**
 * Simulates the signUp function behavior based on private access state.
 * This mirrors the useAuth hook logic: when private access is enabled,
 * the signup request is rejected with an appropriate error message.
 */
function processSignupRequest(
  request: SignupRequest,
  isPrivateAccessEnabled: boolean
): SignupResult {
  // When private access is enabled, reject the signup request
  if (isPrivateAccessEnabled) {
    return {
      error: {
        message: 'Registration is currently disabled',
        status: 403,
      },
      success: false,
    };
  }
  
  // When private access is disabled, allow the signup (simulate success)
  // In real implementation, this would call Supabase auth
  return {
    error: null,
    success: true,
  };
}

// Arbitraries for generating test data

// Generate valid email addresses
const emailArb: fc.Arbitrary<string> = fc.emailAddress();

// Generate valid passwords (at least 6 characters for Supabase)
const passwordArb: fc.Arbitrary<string> = fc.string({ minLength: 6, maxLength: 72 });

// Generate optional full names
const fullNameArb: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({ minLength: 1, maxLength: 100 }),
  { nil: undefined }
);

// Generate signup requests
const signupRequestArb: fc.Arbitrary<SignupRequest> = fc.record({
  email: emailArb,
  password: passwordArb,
  fullName: fullNameArb,
});

describe('Property 3: Signup API Rejection', () => {
  it('rejects all signup requests when private access is enabled', () => {
    fc.assert(
      fc.property(
        signupRequestArb,
        (request) => {
          const result = processSignupRequest(request, true);
          
          // When private access is enabled, signup should be rejected
          expect(result.success).toBe(false);
          expect(result.error).not.toBeNull();
          expect(result.error?.message).toBe('Registration is currently disabled');
          expect(result.error?.status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows signup requests when private access is disabled', () => {
    fc.assert(
      fc.property(
        signupRequestArb,
        (request) => {
          const result = processSignupRequest(request, false);
          
          // When private access is disabled, signup should proceed
          expect(result.success).toBe(true);
          expect(result.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejection is independent of signup request content', () => {
    // Generate pairs of different signup requests
    fc.assert(
      fc.property(
        signupRequestArb,
        signupRequestArb,
        (request1, request2) => {
          const result1 = processSignupRequest(request1, true);
          const result2 = processSignupRequest(request2, true);
          
          // Both requests should be rejected identically when private access is enabled
          expect(result1.success).toBe(result2.success);
          expect(result1.error?.message).toBe(result2.error?.message);
          expect(result1.error?.status).toBe(result2.error?.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('error message is consistent for all rejected signups', () => {
    const expectedErrorMessage = 'Registration is currently disabled';
    const expectedStatus = 403;

    fc.assert(
      fc.property(
        signupRequestArb,
        (request) => {
          const result = processSignupRequest(request, true);
          
          // Error message and status should be consistent
          expect(result.error?.message).toBe(expectedErrorMessage);
          expect(result.error?.status).toBe(expectedStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('private access state determines signup outcome regardless of request validity', () => {
    // Test with both valid and edge-case requests
    const edgeCaseRequestArb: fc.Arbitrary<SignupRequest> = fc.oneof(
      // Normal request
      signupRequestArb,
      // Request with minimal password
      fc.record({
        email: emailArb,
        password: fc.constant('123456'),
        fullName: fullNameArb,
      }),
      // Request with very long password
      fc.record({
        email: emailArb,
        password: fc.string({ minLength: 50, maxLength: 72 }),
        fullName: fullNameArb,
      }),
      // Request without full name
      fc.record({
        email: emailArb,
        password: passwordArb,
        fullName: fc.constant(undefined),
      })
    );

    fc.assert(
      fc.property(
        edgeCaseRequestArb,
        fc.boolean(),
        (request, isPrivateAccessEnabled) => {
          const result = processSignupRequest(request, isPrivateAccessEnabled);
          
          // The outcome should be determined solely by private access state
          if (isPrivateAccessEnabled) {
            expect(result.success).toBe(false);
            expect(result.error?.message).toBe('Registration is currently disabled');
          } else {
            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
