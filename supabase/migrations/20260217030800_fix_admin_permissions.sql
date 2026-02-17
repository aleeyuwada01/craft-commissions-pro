-- Migration: Fix Admin Permissions
-- Created: 2026-02-17 03:08:00

-- 1. Fix Employee Contracts Permissions
-- Ensure admins can INSERT contracts
DROP POLICY IF EXISTS "Admins can insert contracts in their businesses" ON public.employee_contracts;

CREATE POLICY "Admins can insert contracts in their businesses"
ON public.employee_contracts FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    ) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Ensure admins can UPDATE contracts (already covered by "manage" policy, but being explicit helps)
DROP POLICY IF EXISTS "Admins can update contracts in their businesses" ON public.employee_contracts;

CREATE POLICY "Admins can update contracts in their businesses"
ON public.employee_contracts FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    ) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Fix System Settings Permissions (Just to be absolutely sure)
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
CREATE POLICY "Admins can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);
