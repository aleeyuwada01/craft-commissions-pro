-- Migration: Add system settings table
-- Created: 2026-02-17

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage settings
CREATE POLICY "Admins can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Admins can update system settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Admins can insert system settings"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Insert default setting for hard reset
INSERT INTO public.system_settings (key, value, description)
VALUES ('hard_reset_enabled', 'false'::jsonb, 'Enable/Disable hard reset functionality')
ON CONFLICT (key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
