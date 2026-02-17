-- Migration: Add missing termination columns to employee_contracts
-- Created: 2026-02-17 04:20:00

ALTER TABLE public.employee_contracts
ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS termination_reason TEXT;
