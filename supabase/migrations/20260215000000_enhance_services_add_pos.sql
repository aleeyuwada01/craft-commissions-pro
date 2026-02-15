-- Migration: Enhance services table and add POS system
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Enhance existing services table for POS & Bookings
-- =====================================================

-- Add new columns to services table for POS functionality
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'service',
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'service',
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS buffer_time INTEGER DEFAULT 0;

-- Add constraint for service_type
ALTER TABLE public.services
DROP CONSTRAINT IF EXISTS services_service_type_check;

ALTER TABLE public.services
ADD CONSTRAINT services_service_type_check 
CHECK (service_type IN ('service', 'product', 'package'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_sku ON public.services(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_barcode ON public.services(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_type ON public.services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

-- =====================================================
-- PART 2: Create customers table (needed for POS & Bookings)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    gender TEXT,
    notes TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their businesses"
ON public.customers FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = customers.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create customers in their businesses"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update customers in their businesses"
ON public.customers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = customers.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete customers in their businesses"
ON public.customers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = customers.business_id
        AND user_id = auth.uid()
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;

-- =====================================================
-- PART 3: Create POS Sales tables
-- =====================================================

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    sale_number TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, sale_number)
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Add constraint for payment_method
ALTER TABLE public.sales
ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'transfer', 'paystack', 'flutterwave'));

-- Add constraint for payment_status
ALTER TABLE public.sales
ADD CONSTRAINT sales_payment_status_check 
CHECK (payment_status IN ('pending', 'completed', 'refunded'));

-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'successful',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Add constraint for payment status
ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'successful', 'failed'));

-- RLS Policies for sales
CREATE POLICY "Users can view sales in their businesses"
ON public.sales FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = sales.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create sales in their businesses"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update sales in their businesses"
ON public.sales FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = sales.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete sales in their businesses"
ON public.sales FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = sales.business_id
        AND user_id = auth.uid()
    )
);

-- RLS Policies for sale_items
CREATE POLICY "Users can view sale_items through sales"
ON public.sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = sale_items.sale_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create sale_items through sales"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = sale_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update sale_items through sales"
ON public.sale_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = sale_items.sale_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete sale_items through sales"
ON public.sale_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = sale_items.sale_id
        AND bu.user_id = auth.uid()
    )
);

-- RLS Policies for payments
CREATE POLICY "Users can view payments through sales"
ON public.payments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = payments.sale_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create payments through sales"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales s
        JOIN public.business_units bu ON bu.id = s.business_id
        WHERE s.id = sale_id
        AND bu.user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX idx_sales_business_id ON public.sales(business_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX idx_sales_sale_number ON public.sales(sale_number);
CREATE INDEX idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_service_id ON public.sale_items(service_id);
CREATE INDEX idx_payments_sale_id ON public.payments(sale_id);

-- Enable realtime for sales
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;

-- Function to auto-generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_sale_number TEXT;
BEGIN
    -- Get count of sales for this business
    SELECT COUNT(*) INTO v_count
    FROM public.sales
    WHERE business_id = p_business_id;
    
    -- Generate sale number: SALE-YYYYMMDD-XXXX
    v_sale_number := 'SALE-' || 
                     TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_sale_number;
END;
$$;
