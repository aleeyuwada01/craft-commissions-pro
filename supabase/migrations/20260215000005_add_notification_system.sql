-- Migration: Add Notification System
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Notification Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL UNIQUE,
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_token TEXT,
    sms_enabled BOOLEAN DEFAULT false,
    sms_provider TEXT,
    sms_api_key TEXT,
    email_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Notifications Log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    recipient_type TEXT NOT NULL,
    recipient_id UUID,
    channel TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Add constraints
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_recipient_type_check 
CHECK (recipient_type IN ('customer', 'employee'));

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_channel_check 
CHECK (channel IN ('email', 'sms', 'whatsapp'));

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_status_check 
CHECK (status IN ('pending', 'sent', 'failed'));

-- =====================================================
-- RLS Policies
-- =====================================================

CREATE POLICY "Users can manage notification settings in their businesses"
ON public.notification_settings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = notification_settings.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can view notifications in their businesses"
ON public.notifications FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = notifications.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create notifications in their businesses"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id AND user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers
-- =====================================================

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to schedule booking reminder
CREATE OR REPLACE FUNCTION public.schedule_booking_reminder(
    p_booking_id UUID,
    p_hours_before INTEGER DEFAULT 24
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_reminder_message TEXT;
BEGIN
    -- Get booking details
    SELECT 
        b.business_id,
        b.customer_id,
        b.booking_date,
        b.start_time,
        c.name as customer_name,
        c.email,
        c.phone,
        s.name as service_name
    INTO v_booking
    FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    JOIN public.services s ON s.id = b.service_id
    WHERE b.id = p_booking_id;
    
    -- Create reminder message
    v_reminder_message := 'Hi ' || v_booking.customer_name || 
                          ', this is a reminder of your ' || v_booking.service_name || 
                          ' appointment on ' || TO_CHAR(v_booking.booking_date, 'DD Mon YYYY') || 
                          ' at ' || TO_CHAR(v_booking.start_time, 'HH12:MI AM') || 
                          '. We look forward to seeing you!';
    
    -- Create notification (would be processed by edge function)
    INSERT INTO public.notifications (
        business_id, recipient_type, recipient_id, 
        channel, type, subject, message
    ) VALUES (
        v_booking.business_id, 'customer', v_booking.customer_id,
        'sms', 'booking_reminder', 'Appointment Reminder', v_reminder_message
    );
    
END;
$$;

-- Function to notify low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_low_stock RECORD;
    v_message TEXT;
BEGIN
    -- Find low stock items
    FOR v_low_stock IN
        SELECT 
            i.business_id,
            s.name as service_name,
            i.quantity_on_hand,
            i.reorder_level
        FROM public.inventory i
        JOIN public.services s ON s.id = i.service_id
        WHERE i.quantity_on_hand <= i.reorder_level
    LOOP
        v_message := 'Low stock alert: ' || v_low_stock.service_name || 
                     ' has only ' || v_low_stock.quantity_on_hand || 
                     ' units remaining (reorder level: ' || v_low_stock.reorder_level || ')';
        
        INSERT INTO public.notifications (
            business_id, recipient_type, channel, type, subject, message
        ) VALUES (
            v_low_stock.business_id, 'employee', 'email', 
            'low_stock', 'Low Stock Alert', v_message
        );
    END LOOP;
END;
$$;

-- Indexes
CREATE INDEX idx_notification_settings_business_id ON public.notification_settings(business_id);
CREATE INDEX idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- Enable Realtime
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
