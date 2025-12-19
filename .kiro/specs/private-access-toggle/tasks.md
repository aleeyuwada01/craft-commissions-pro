# Implementation Plan

- [x] 1. Create database schema and RLS policies





  - [x] 1.1 Create app_settings table migration


    - Create migration file with app_settings table (id, key, value JSONB, updated_at)
    - Add unique constraint on key column
    - Insert default private_access_enabled setting as false
    - _Requirements: 5.1, 5.2_

  - [x] 1.2 Create RLS policies for app_settings

    - Enable RLS on app_settings table
    - Create policy allowing all authenticated users to read settings
    - Create policy allowing only admin users to insert/update/delete settings
    - _Requirements: 5.3_

  - [x] 1.3 Write property test for RLS admin-only modification

    - **Property 4: RLS Admin-Only Modification**
    - **Validates: Requirements 5.3**

- [-] 2. Create usePrivateAccess hook



  - [x] 2.1 Implement usePrivateAccess hook


    - Create src/hooks/usePrivateAccess.tsx
    - Implement fetch logic to read private_access_enabled from app_settings
    - Implement setPrivateAccess function to update the setting
    - Handle loading and error states
    - Default to false when setting not found or database unavailable
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Write property test for toggle persistence

    - **Property 1: Toggle Persistence Consistency**
    - **Validates: Requirements 1.2, 1.3**

- [x] 3. Add Access Control section to GlobalSettings





  - [x] 3.1 Implement Access Control UI in GlobalSettings


    - Add new Card section with Lock icon for Access Control
    - Add Switch component for Private Access toggle
    - Wire up usePrivateAccess hook
    - Display toast notifications on setting change
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Write unit tests for Access Control section

    - Test toggle renders correctly
    - Test toggle state reflects hook state
    - Test toast appears on change

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify Auth page to enforce private access






  - [x] 5.1 Update Auth page to check private access mode

    - Import and use usePrivateAccess hook
    - Add loading state while fetching private access status
    - Redirect to login view if private access enabled and user tries signup
    - Hide "Don't have an account? Sign up" link when private access enabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.2 Write property test for signup redirect enforcement

    - **Property 2: Signup Redirect Enforcement**
    - **Validates: Requirements 2.1**

- [x] 6. Modify useAuth hook to block signups






  - [x] 6.1 Update signUp function in useAuth hook

    - Check private access status before calling Supabase signUp
    - Return error with message "Registration is currently disabled" when private access enabled
    - Proceed normally when private access disabled
    - _Requirements: 3.1, 3.2, 3.3_


  - [x] 6.2 Write property test for signup API rejection

    - **Property 3: Signup API Rejection**
    - **Validates: Requirements 3.1, 3.2**

- [x] 7. Update Supabase types






  - [x] 7.1 Regenerate TypeScript types

    - Generate updated types to include app_settings table
    - Update src/integrations/supabase/types.ts
    - _Requirements: 5.1_

- [x] 8. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
