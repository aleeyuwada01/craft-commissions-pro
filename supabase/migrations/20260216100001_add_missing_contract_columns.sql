-- Add missing columns to employee_contracts that were in the second migration
-- but never created because CREATE TABLE IF NOT EXISTS was a no-op

ALTER TABLE public.employee_contracts
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'employment',
ADD COLUMN IF NOT EXISTS terms TEXT,
ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(20),
ADD COLUMN IF NOT EXISTS employer_signature TEXT,
ADD COLUMN IF NOT EXISTS employer_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Set default title for any existing contracts that have null title
UPDATE public.employee_contracts
SET title = 'Employment Contract'
WHERE title IS NULL;

-- Make title NOT NULL now that existing rows have values
ALTER TABLE public.employee_contracts
ALTER COLUMN title SET NOT NULL;

-- Update status constraint to include all statuses used by the frontend
ALTER TABLE public.employee_contracts DROP CONSTRAINT IF EXISTS employee_contracts_status_check;
ALTER TABLE public.employee_contracts
ADD CONSTRAINT employee_contracts_status_check
CHECK (status IN ('draft', 'pending', 'pending_signature', 'signed', 'expired', 'terminated'));
