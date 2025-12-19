# Implementation Plan

- [x] 1. Create commission calculation utility






  - [x] 1.1 Create `src/lib/commission.ts` with `calculateCommission` function

    - Implement pure function that takes sale amount, commission type, percentage, and fixed amount
    - Return object with commission and houseAmount
    - Handle both 'percentage' and 'fixed' commission types
    - _Requirements: 2.2, 2.3_
  - [x] 1.2 Write property test for percentage commission calculation


    - **Property 2: Percentage commission calculation**
    - **Validates: Requirements 2.2**
  - [x] 1.3 Write property test for fixed commission calculation

    - **Property 3: Fixed commission calculation**
    - **Validates: Requirements 2.3**

- [x] 2. Create useServices hook for fetching business services






  - [x] 2.1 Create `src/hooks/useServices.tsx` hook

    - Accept businessId parameter
    - Fetch only active services (is_active = true) for the business
    - Return services array, loading state, and error
    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Write property test for service filtering

    - **Property 6: Service filtering by business unit**
    - **Validates: Requirements 4.1**

- [x] 3. Create SaleRecordDialog component






  - [x] 3.1 Create `src/components/SaleRecordDialog.tsx` component

    - Accept props: open, onOpenChange, employeeId, businessId, commission settings, onSuccess callback
    - Include service dropdown using useServices hook
    - Include amount input field with auto-population on service selection
    - Include commission preview section
    - Include submit button with loading state
    - _Requirements: 1.1, 1.2, 1.5, 2.1_

  - [x] 3.2 Write property test for service price auto-population

    - **Property 1: Service price auto-population**
    - **Validates: Requirements 1.2**

- [x] 4. Implement transaction recording logic





  - [x] 4.1 Add transaction insert logic to SaleRecordDialog


    - Insert transaction with business_id, employee_id, service_id, amounts
    - Use calculateCommission utility for commission/house amounts
    - Call logActivity on success with action "sale_recorded"
    - Show success toast and call onSuccess callback
    - _Requirements: 1.3, 3.1, 3.2, 3.3_
  - [x] 4.2 Write property test for business unit association


    - **Property 4: Business unit association**
    - **Validates: Requirements 3.1**
  - [x] 4.3 Write property test for activity logging


    - **Property 5: Activity logging on sale**
    - **Validates: Requirements 3.3**

- [x] 5. Integrate SaleRecordDialog into EmployeeDashboard






  - [x] 5.1 Add "Record Sale" button to EmployeeDashboard header

    - Add state for dialog open/close
    - Pass employee data (id, businessId, commission settings) to dialog
    - Trigger data refresh on successful sale
    - _Requirements: 1.1, 1.4_

- [x] 6. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
