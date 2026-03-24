-- Add missing DELETE RLS policies to allow business unit cascade deletion
-- 1. employee_activity_logs
CREATE POLICY "Business owners can delete employee activity logs"
ON public.employee_activity_logs FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.business_units bu ON bu.id = e.business_id
    WHERE e.id = employee_activity_logs.employee_id
    AND bu.user_id = auth.uid()
  )
);

-- 2. stock_movements
CREATE POLICY "Users can delete stock_movements in their businesses"
ON public.stock_movements FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_units bu
    WHERE bu.id = stock_movements.business_id
    AND bu.user_id = auth.uid()
  )
);

-- 3. payment_transactions
CREATE POLICY "Users can delete payment_transactions in their businesses"
ON public.payment_transactions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_units bu
    WHERE bu.id = payment_transactions.business_id
    AND bu.user_id = auth.uid()
  )
);

-- 4. notifications
CREATE POLICY "Users can delete notifications in their businesses"
ON public.notifications FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_units bu
    WHERE bu.id = notifications.business_id
    AND bu.user_id = auth.uid()
  )
);

-- 5. booking_history
CREATE POLICY "Users can delete booking_history in their businesses"
ON public.booking_history FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.business_units bu ON bu.id = b.business_id
    WHERE b.id = booking_history.booking_id
    AND bu.user_id = auth.uid()
  )
);

-- 6. payments
CREATE POLICY "Users can delete payments in their businesses"
ON public.payments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    JOIN public.business_units bu ON bu.id = s.business_id
    WHERE s.id = payments.sale_id
    AND bu.user_id = auth.uid()
  )
);
