-- Migration: Fix POS sales schema for part payments
-- Add amount_paid and balance_due columns, update payment_status constraint

-- Add missing columns
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10,2) DEFAULT 0.00;

-- Drop old constraint and add updated one that includes 'partial'
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_payment_status_check;

ALTER TABLE public.sales
ADD CONSTRAINT sales_payment_status_check 
CHECK (payment_status IN ('pending', 'completed', 'partial', 'refunded'));
