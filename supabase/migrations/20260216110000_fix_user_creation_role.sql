-- Enum value 'employee' added manually/separately to avoid transaction issues
-- ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';


-- Update the handle_new_user function to respect the role passed in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Assign role from metadata, defaulting to 'admin' only if not provided
  -- This allows creating employees with 'employee' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'admin'));

  RETURN NEW;
END;
$$;

-- Fix existing employees who were incorrectly assigned 'admin' role
-- We only update users who are present in the employees table
UPDATE public.user_roles
SET role = 'employee'::public.app_role
WHERE user_id IN (
    SELECT user_id 
    FROM public.employees 
    WHERE user_id IS NOT NULL AND is_active = true
) 
AND role = 'admin'::public.app_role
AND user_id NOT IN (
    SELECT user_id FROM public.business_units
);
