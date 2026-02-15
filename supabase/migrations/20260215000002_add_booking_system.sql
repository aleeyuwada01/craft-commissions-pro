-- Migration: Add Booking System
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Staff Schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(employee_id, day_of_week)
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Bookings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    booking_number TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    price DECIMAL(10,2) NOT NULL,
    deposit_paid DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, booking_number)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Add constraint for status
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

-- =====================================================
-- PART 3: Booking History
-- =====================================================

CREATE TABLE IF NOT EXISTS public.booking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Staff schedules policies
CREATE POLICY "Users can view staff schedules in their businesses"
ON public.staff_schedules FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = staff_schedules.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage staff schedules in their businesses"
ON public.staff_schedules FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = staff_schedules.business_id AND user_id = auth.uid()
    )
);

-- Bookings policies
CREATE POLICY "Users can view bookings in their businesses"
ON public.bookings FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = bookings.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create bookings in their businesses"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update bookings in their businesses"
ON public.bookings FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = bookings.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete bookings in their businesses"
ON public.bookings FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = bookings.business_id AND user_id = auth.uid()
    )
);

-- Booking history policies
CREATE POLICY "Users can view booking history through bookings"
ON public.booking_history FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.business_units bu ON bu.id = b.business_id
        WHERE b.id = booking_history.booking_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create booking history through bookings"
ON public.booking_history FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.business_units bu ON bu.id = b.business_id
        WHERE b.id = booking_id
        AND bu.user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Trigger for staff_schedules updated_at
CREATE TRIGGER update_staff_schedules_updated_at
    BEFORE UPDATE ON public.staff_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for bookings updated_at
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track booking status changes
CREATE OR REPLACE FUNCTION public.track_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only track if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.booking_history (
            booking_id, status, changed_by, notes
        ) VALUES (
            NEW.id, NEW.status, auth.uid(), 
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to track booking status changes
CREATE TRIGGER on_booking_status_changed
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.track_booking_status_change();

-- Function to generate booking number
CREATE OR REPLACE FUNCTION public.generate_booking_number(p_business_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_booking_number TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.bookings
    WHERE business_id = p_business_id;
    
    v_booking_number := 'BK-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_booking_number;
END;
$$;

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
    p_employee_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE employee_id = p_employee_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
    AND (
        (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );
    
    RETURN v_conflict_count > 0;
END;
$$;

-- Indexes
CREATE INDEX idx_staff_schedules_employee_id ON public.staff_schedules(employee_id);
CREATE INDEX idx_staff_schedules_business_id ON public.staff_schedules(business_id);
CREATE INDEX idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_employee_id ON public.bookings(employee_id);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_booking_history_booking_id ON public.booking_history(booking_id);

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
