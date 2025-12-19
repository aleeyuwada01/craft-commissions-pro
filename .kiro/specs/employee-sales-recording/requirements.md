# Requirements Document

## Introduction

This feature enables employees to record their own sales directly from the Employee Dashboard. Currently, only business owners/admins can record sales through the Business Dashboard. This enhancement empowers employees to log their transactions in real-time, improving data accuracy and reducing administrative burden on business owners.

## Glossary

- **Employee_Dashboard**: The interface accessible to employees showing their personal performance metrics, commissions, and transaction history
- **Transaction**: A recorded sale that includes service provided, sale amount, commission earned, and house earnings
- **Service**: A predefined offering with a base price that can be selected when recording a sale
- **Commission**: The portion of a sale amount that goes to the employee, calculated based on their commission type (percentage or fixed)
- **House_Amount**: The portion of a sale amount retained by the business after commission deduction

## Requirements

### Requirement 1

**User Story:** As an employee, I want to record my own sales from my dashboard, so that I can log transactions immediately after completing a service without waiting for an administrator.

#### Acceptance Criteria

1. WHEN an employee clicks the "Record Sale" button on the Employee_Dashboard THEN the System SHALL display a sale recording dialog with service selection and amount input fields
2. WHEN an employee selects a service from the dropdown THEN the System SHALL auto-populate the amount field with the service's base price
3. WHEN an employee submits a valid sale with a selected service and amount THEN the System SHALL create a new Transaction record with the employee's ID, calculated commission, and house amount
4. WHEN a sale is successfully recorded THEN the System SHALL update the employee's dashboard statistics in real-time to reflect the new transaction
5. WHEN an employee attempts to submit a sale without selecting a service THEN the System SHALL prevent submission and display a validation message

### Requirement 2

**User Story:** As an employee, I want to see a preview of my commission before submitting a sale, so that I can verify the calculation is correct.

#### Acceptance Criteria

1. WHEN an employee enters a sale amount THEN the System SHALL display a commission preview showing the calculated commission based on the employee's commission type
2. WHEN the employee's commission type is percentage THEN the System SHALL calculate commission as (sale_amount × commission_percentage / 100)
3. WHEN the employee's commission type is fixed THEN the System SHALL display the fixed commission amount regardless of sale amount
4. WHEN the sale amount changes THEN the System SHALL immediately recalculate and update the commission preview

### Requirement 3

**User Story:** As an employee, I want my recorded sales to be associated with my business unit, so that the business owner can track all sales accurately.

#### Acceptance Criteria

1. WHEN an employee records a sale THEN the System SHALL automatically associate the transaction with the employee's assigned business unit
2. WHEN a sale is recorded by an employee THEN the System SHALL make the transaction visible in the Business Dashboard for the business owner
3. WHEN an employee records a sale THEN the System SHALL log the activity with action type "sale_recorded" for audit purposes

### Requirement 4

**User Story:** As an employee, I want to only see services that belong to my business unit, so that I can quickly select the correct service.

#### Acceptance Criteria

1. WHEN the sale recording dialog opens THEN the System SHALL fetch and display only active services belonging to the employee's business unit
2. WHEN no active services exist for the business unit THEN the System SHALL display a message indicating no services are available and disable the submit button
