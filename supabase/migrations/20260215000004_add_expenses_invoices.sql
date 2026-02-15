-- Migration: Add Expense Tracking and Invoicing
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Expense Categories
-- =====================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Expenses
-- =====================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: Invoices
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Add constraint for status
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- =====================================================
-- PART 4: Invoice Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 5: Customer Tags (for CRM)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.customer_tags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (customer_id, tag_id)
);

ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 6: Payment Gateway Configuration
-- =====================================================

ALTER TABLE public.business_units
ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT,
ADD COLUMN IF NOT EXISTS paystack_public_key TEXT,
ADD COLUMN IF NOT EXISTS flutterwave_secret_key TEXT,
ADD COLUMN IF NOT EXISTS flutterwave_public_key TEXT;

-- =====================================================
-- PART 7: Payment Transactions (for online payments)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    gateway TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'initiated',
    customer_email TEXT,
    callback_url TEXT,
    metadata JSONB DEFAULT '{}',
    gateway_response JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Add constraint for gateway
ALTER TABLE public.payment_transactions
ADD CONSTRAINT payment_transactions_gateway_check 
CHECK (gateway IN ('paystack', 'flutterwave'));

-- Add constraint for status
ALTER TABLE public.payment_transactions
ADD CONSTRAINT payment_transactions_status_check 
CHECK (status IN ('initiated', 'successful', 'failed', 'cancelled'));

-- =====================================================
-- RLS Policies
-- =====================================================

-- Expense categories policies
CREATE POLICY "Users can manage expense categories in their businesses"
ON public.expense_categories FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = expense_categories.business_id AND user_id = auth.uid()
    )
);

-- Expenses policies
CREATE POLICY "Users can view expenses in their businesses"
ON public.expenses FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = expenses.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create expenses in their businesses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update expenses in their businesses"
ON public.expenses FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = expenses.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete expenses in their businesses"
ON public.expenses FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = expenses.business_id AND user_id = auth.uid()
    )
);

-- Invoices policies
CREATE POLICY "Users can manage invoices in their businesses"
ON public.invoices FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = invoices.business_id AND user_id = auth.uid()
    )
);

-- Invoice items policies
CREATE POLICY "Users can manage invoice items through invoices"
ON public.invoice_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.invoices i
        JOIN public.business_units bu ON bu.id = i.business_id
        WHERE i.id = invoice_items.invoice_id
        AND bu.user_id = auth.uid()
    )
);

-- Customer tags policies
CREATE POLICY "Users can manage customer tags in their businesses"
ON public.customer_tags FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = customer_tags.business_id AND user_id = auth.uid()
    )
);

-- Customer tag assignments policies
CREATE POLICY "Users can manage customer tag assignments"
ON public.customer_tag_assignments FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.customers c
        JOIN public.business_units bu ON bu.id = c.business_id
        WHERE c.id = customer_tag_assignments.customer_id
        AND bu.user_id = auth.uid()
    )
);

-- Payment transactions policies
CREATE POLICY "Users can view payment transactions in their businesses"
ON public.payment_transactions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = payment_transactions.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create payment transactions in their businesses"
ON public.payment_transactions FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Trigger for invoices updated_at
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for payment_transactions updated_at
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update invoice status based on payment
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If fully paid, mark as paid
    IF NEW.amount_paid >= NEW.total_amount THEN
        NEW.status := 'paid';
    -- If overdue and not paid
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.amount_paid < NEW.total_amount AND NEW.status = 'sent' THEN
        NEW.status := 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-update invoice status
CREATE TRIGGER on_invoice_payment_update
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_invoice_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.invoices
    WHERE business_id = p_business_id;
    
    v_invoice_number := 'INV-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_invoice_number;
END;
$$;

-- Indexes
CREATE INDEX idx_expense_categories_business_id ON public.expense_categories(business_id);
CREATE INDEX idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_customer_tags_business_id ON public.customer_tags(business_id);
CREATE INDEX idx_payment_transactions_business_id ON public.payment_transactions(business_id);
CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions(reference);
