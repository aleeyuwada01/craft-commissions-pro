-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create business_units table
CREATE TABLE public.business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'custom',
    icon TEXT DEFAULT 'building',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Create employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    house_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    is_commission_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- RLS Policies

-- User roles: users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Business units policies
CREATE POLICY "Users can view own business units"
ON public.business_units FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create business units"
ON public.business_units FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business units"
ON public.business_units FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business units"
ON public.business_units FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Employees policies (access through business ownership)
CREATE POLICY "Users can view employees in their businesses"
ON public.employees FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = employees.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create employees in their businesses"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update employees in their businesses"
ON public.employees FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = employees.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete employees in their businesses"
ON public.employees FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = employees.business_id
        AND user_id = auth.uid()
    )
);

-- Services policies
CREATE POLICY "Users can view services in their businesses"
ON public.services FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = services.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create services in their businesses"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update services in their businesses"
ON public.services FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = services.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete services in their businesses"
ON public.services FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = services.business_id
        AND user_id = auth.uid()
    )
);

-- Transactions policies
CREATE POLICY "Users can view transactions in their businesses"
ON public.transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = transactions.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create transactions in their businesses"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update transactions in their businesses"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = transactions.business_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete transactions in their businesses"
ON public.transactions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = transactions.business_id
        AND user_id = auth.uid()
    )
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_units_updated_at
    BEFORE UPDATE ON public.business_units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();