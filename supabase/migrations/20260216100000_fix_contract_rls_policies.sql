-- Fix employee_contracts RLS policies: change owner_id to user_id

-- Drop all existing policies on employee_contracts
DROP POLICY IF EXISTS "Users can view contracts for their businesses" ON public.employee_contracts;
DROP POLICY IF EXISTS "Business owners can insert contracts" ON public.employee_contracts;
DROP POLICY IF EXISTS "Business owners and employees can update their contracts" ON public.employee_contracts;
DROP POLICY IF EXISTS "Business owners can delete contracts" ON public.employee_contracts;
DROP POLICY IF EXISTS "Admins can view contracts in their businesses" ON public.employee_contracts;
DROP POLICY IF EXISTS "Admins can manage contracts in their businesses" ON public.employee_contracts;
DROP POLICY IF EXISTS "Employees can view their own contracts" ON public.employee_contracts;
DROP POLICY IF EXISTS "Employees can sign their own contracts" ON public.employee_contracts;

-- Recreate with correct user_id reference

CREATE POLICY "Business owners can view contracts"
ON public.employee_contracts FOR SELECT TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Employees can view own contracts"
ON public.employee_contracts FOR SELECT TO authenticated
USING (
    employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Business owners can create contracts"
ON public.employee_contracts FOR INSERT TO authenticated
WITH CHECK (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Business owners can update contracts"
ON public.employee_contracts FOR UPDATE TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Employees can sign own contracts"
ON public.employee_contracts FOR UPDATE TO authenticated
USING (
    employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Business owners can delete contracts"
ON public.employee_contracts FOR DELETE TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
);

-- Fix contract_templates RLS policies
DROP POLICY IF EXISTS "Users can view templates for their businesses" ON public.contract_templates;
DROP POLICY IF EXISTS "Business owners can manage templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Users can view contract templates in their businesses" ON public.contract_templates;
DROP POLICY IF EXISTS "Users can manage contract templates in their businesses" ON public.contract_templates;

CREATE POLICY "Users can view contract templates"
ON public.contract_templates FOR SELECT TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
    OR business_id IS NULL
);

CREATE POLICY "Owners can manage contract templates"
ON public.contract_templates FOR ALL TO authenticated
USING (
    business_id IN (
        SELECT id FROM public.business_units WHERE user_id = auth.uid()
    )
);

-- Fix contract_penalties RLS policies
DROP POLICY IF EXISTS "Admins can view penalties in their businesses" ON public.contract_penalties;
DROP POLICY IF EXISTS "Admins can manage penalties in their businesses" ON public.contract_penalties;
DROP POLICY IF EXISTS "Employees can view their own penalties" ON public.contract_penalties;

CREATE POLICY "Owners can view penalties"
ON public.contract_penalties FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employee_contracts ec
        JOIN public.business_units bu ON bu.id = ec.business_id
        WHERE ec.id = contract_penalties.contract_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Owners can manage penalties"
ON public.contract_penalties FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employee_contracts ec
        JOIN public.business_units bu ON bu.id = ec.business_id
        WHERE ec.id = contract_penalties.contract_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Employees can view own penalties"
ON public.contract_penalties FOR SELECT TO authenticated
USING (
    employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
);
