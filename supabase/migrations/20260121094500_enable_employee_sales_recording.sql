-- Enable employees to record sales from their dashboard
-- This migration adds RLS policies for:
-- 1. Employees to view services in their business (for service dropdown)
-- 2. Employees to insert their own transactions (to record sales)

-- 1. Allow employees to view services in their business
CREATE POLICY "Employees can view services in their business"
ON public.services FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.business_id = services.business_id
        AND employees.user_id = auth.uid()
    )
);

-- 2. Allow employees to insert their own transactions
CREATE POLICY "Employees can insert own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    -- Employee must be inserting for themselves and in their assigned business
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = employee_id
        AND employees.user_id = auth.uid()
        AND employees.business_id = business_id
    )
);
