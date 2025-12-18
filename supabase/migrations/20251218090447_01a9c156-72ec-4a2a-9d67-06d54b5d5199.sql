-- Add user_id column to employees table for linking to auth accounts
ALTER TABLE public.employees ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policy for employees to allow them to view their own record
CREATE POLICY "Employees can view own record"
ON public.employees FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow employees to view their own transactions
CREATE POLICY "Employees can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
);

-- Update user_roles policies to allow inserting employee roles (via trigger)
-- The handle_new_user function already handles this, we just need to make it flexible