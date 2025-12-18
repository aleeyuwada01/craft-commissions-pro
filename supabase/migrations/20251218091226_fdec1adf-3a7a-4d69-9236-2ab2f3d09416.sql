-- Add commission_type column to employees table
ALTER TABLE public.employees ADD COLUMN commission_type TEXT NOT NULL DEFAULT 'percentage';
-- commission_type can be 'percentage' or 'fixed'

-- Add fixed_commission column for fixed amount commissions
ALTER TABLE public.employees ADD COLUMN fixed_commission NUMERIC(10,2) DEFAULT 0;