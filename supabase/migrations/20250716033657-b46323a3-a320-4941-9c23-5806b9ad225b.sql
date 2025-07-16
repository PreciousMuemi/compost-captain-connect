-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'dispatch', 'farmer', 'buyer');

-- Create waste types enum
CREATE TYPE public.waste_type AS ENUM ('animal_manure', 'coffee_husks', 'rice_hulls', 'maize_stalks', 'other');

-- Create waste status enum
CREATE TYPE public.waste_status AS ENUM ('reported', 'scheduled', 'collected', 'processed');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    location TEXT,
    role user_role NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create waste_reports table
CREATE TABLE public.waste_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    waste_type waste_type NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    status waste_status DEFAULT 'reported',
    location TEXT,
    scheduled_pickup_date TIMESTAMP WITH TIME ZONE,
    collected_date TIMESTAMP WITH TIME ZONE,
    assigned_driver_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_waste_kg DECIMAL(10,2) DEFAULT 0,
    processed_manure_kg DECIMAL(10,2) DEFAULT 0,
    pellets_ready_kg DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    location TEXT,
    is_farmer BOOLEAN DEFAULT false,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status order_status DEFAULT 'pending',
    delivery_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.orders(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL, -- 'waste_purchase' or 'manure_sale'
    status payment_status DEFAULT 'pending',
    mpesa_transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for waste_reports
CREATE POLICY "Farmers can view their own waste reports" ON public.waste_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = waste_reports.farmer_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Farmers can create waste reports" ON public.waste_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = waste_reports.farmer_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin and dispatch can view all waste reports" ON public.waste_reports
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

CREATE POLICY "Admin and dispatch can update waste reports" ON public.waste_reports
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

-- RLS Policies for inventory
CREATE POLICY "Admin and dispatch can view inventory" ON public.inventory
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

CREATE POLICY "Admin can update inventory" ON public.inventory
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for customers
CREATE POLICY "Admin and dispatch can manage customers" ON public.customers
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

-- RLS Policies for orders
CREATE POLICY "Admin and dispatch can manage orders" ON public.orders
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

-- RLS Policies for payments
CREATE POLICY "Admin and dispatch can view payments" ON public.payments
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

CREATE POLICY "Admin can manage payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waste_reports_updated_at
    BEFORE UPDATE ON public.waste_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial inventory record
INSERT INTO public.inventory (raw_waste_kg, processed_manure_kg, pellets_ready_kg)
VALUES (0, 0, 0);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone_number, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer')
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();