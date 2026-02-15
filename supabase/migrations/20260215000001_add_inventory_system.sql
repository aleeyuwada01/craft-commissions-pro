-- Migration: Add Inventory Management System
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Inventory tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(service_id, business_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Stock movements
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Add constraint for movement_type
ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_movement_type_check 
CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'waste'));

-- =====================================================
-- PART 3: Suppliers
-- =====================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: Purchase Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status TEXT NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, order_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Add constraint for status
ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled'));

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Inventory policies
CREATE POLICY "Users can view inventory in their businesses"
ON public.inventory FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = inventory.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage inventory in their businesses"
ON public.inventory FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = inventory.business_id AND user_id = auth.uid()
    )
);

-- Stock movements policies
CREATE POLICY "Users can view stock movements in their businesses"
ON public.stock_movements FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = stock_movements.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create stock movements in their businesses"
ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    )
);

-- Suppliers policies
CREATE POLICY "Users can view suppliers in their businesses"
ON public.suppliers FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = suppliers.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage suppliers in their businesses"
ON public.suppliers FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = suppliers.business_id AND user_id = auth.uid()
    )
);

-- Purchase orders policies
CREATE POLICY "Users can view purchase orders in their businesses"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = purchase_orders.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage purchase orders in their businesses"
ON public.purchase_orders FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = purchase_orders.business_id AND user_id = auth.uid()
    )
);

-- Purchase order items policies
CREATE POLICY "Users can view PO items through purchase orders"
ON public.purchase_order_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.business_units bu ON bu.id = po.business_id
        WHERE po.id = purchase_order_items.purchase_order_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage PO items through purchase orders"
ON public.purchase_order_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.business_units bu ON bu.id = po.business_id
        WHERE po.id = purchase_order_items.purchase_order_id
        AND bu.user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Trigger for inventory updated_at
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for suppliers updated_at
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for purchase_orders updated_at
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update inventory when sale is made
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
BEGIN
    -- Get business_id from sale
    SELECT business_id INTO v_business_id
    FROM public.sales
    WHERE id = NEW.sale_id;
    
    -- Update inventory (reduce stock)
    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand - NEW.quantity
    WHERE service_id = NEW.service_id
    AND business_id = v_business_id;
    
    -- Record stock movement
    INSERT INTO public.stock_movements (
        service_id, business_id, movement_type, 
        quantity, reference_id, created_by
    ) VALUES (
        NEW.service_id, v_business_id, 'sale',
        -NEW.quantity, NEW.sale_id, auth.uid()
    );
    
    RETURN NEW;
END;
$$;

-- Trigger to update inventory on sale
CREATE TRIGGER on_sale_item_created
    AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_sale();

-- Function to generate purchase order number
CREATE OR REPLACE FUNCTION public.generate_po_number(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_po_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.purchase_orders
    WHERE business_id = p_business_id;
    
    v_po_number := 'PO-' || 
                   TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                   LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_po_number;
END;
$$;

-- Indexes
CREATE INDEX idx_inventory_service_id ON public.inventory(service_id);
CREATE INDEX idx_inventory_business_id ON public.inventory(business_id);
CREATE INDEX idx_stock_movements_service_id ON public.stock_movements(service_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX idx_purchase_orders_business_id ON public.purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
