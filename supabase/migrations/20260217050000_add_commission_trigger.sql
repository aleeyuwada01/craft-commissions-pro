-- Migration: Add commission trigger and linking
-- Created: 2026-02-17
-- Description: Adds sale_id to transactions and creates a trigger to automatically record commissions when a sale is created.

-- 1. Add sale_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_sale_id ON public.transactions(sale_id);

-- 2. Create function to calculate and record commission
CREATE OR REPLACE FUNCTION public.process_sale_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_commission_amount DECIMAL(10,2);
    v_house_amount DECIMAL(10,2);
    v_employee_record RECORD;
BEGIN
    -- If no employee associated with sale, exit
    IF NEW.employee_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get employee commission details
    SELECT * INTO v_employee_record
    FROM public.employees
    WHERE id = NEW.employee_id;

    -- If employee not found or not active, exit
    IF v_employee_record IS NULL OR v_employee_record.is_active = false THEN
        RETURN NEW;
    END IF;

    -- Calculate commission based on type
    IF v_employee_record.commission_type = 'fixed' THEN
        v_commission_amount := COALESCE(v_employee_record.fixed_commission, 0);
    ELSE
        -- Percentage calculation
        v_commission_amount := (NEW.total_amount * v_employee_record.commission_percentage) / 100;
    END IF;

    -- Calculate house amount
    v_house_amount := NEW.total_amount - v_commission_amount;

    -- Insert into transactions
    INSERT INTO public.transactions (
        business_id,
        employee_id,
        sale_id,
        total_amount,
        commission_amount,
        house_amount,
        notes,
        is_commission_paid,
        created_at
    ) VALUES (
        NEW.business_id,
        NEW.employee_id,
        NEW.id,
        NEW.total_amount,
        v_commission_amount,
        v_house_amount,
        'Commission for Sale ' || NEW.sale_number,
        false,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- 3. Create trigger on sales table
DROP TRIGGER IF EXISTS on_sale_created_commission ON public.sales;

CREATE TRIGGER on_sale_created_commission
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.process_sale_commission();
