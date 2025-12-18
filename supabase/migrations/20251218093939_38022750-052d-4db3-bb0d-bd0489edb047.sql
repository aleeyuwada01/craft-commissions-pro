-- Create employee activity logs table
CREATE TABLE public.employee_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_activity_logs ENABLE ROW LEVEL SECURITY;

-- Business owners can view activity logs for their employees
CREATE POLICY "Business owners can view employee activity logs"
ON public.employee_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN business_units bu ON bu.id = e.business_id
    WHERE e.id = employee_activity_logs.employee_id
    AND bu.user_id = auth.uid()
  )
);

-- Employees can view their own activity
CREATE POLICY "Employees can view own activity"
ON public.employee_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_activity_logs.employee_id
    AND e.user_id = auth.uid()
  )
);

-- System can insert logs (via service role or authenticated users)
CREATE POLICY "Authenticated users can insert activity logs"
ON public.employee_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_activity_logs.employee_id
    AND e.user_id = auth.uid()
  )
);

-- Business owners can insert logs for their employees
CREATE POLICY "Business owners can insert employee activity logs"
ON public.employee_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN business_units bu ON bu.id = e.business_id
    WHERE e.id = employee_activity_logs.employee_id
    AND bu.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_activity_logs_employee_id ON public.employee_activity_logs(employee_id);
CREATE INDEX idx_activity_logs_created_at ON public.employee_activity_logs(created_at DESC);