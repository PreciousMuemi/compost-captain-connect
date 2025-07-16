-- Check if enums exist and create them only if they don't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waste_type') THEN
        CREATE TYPE public.waste_type AS ENUM ('animal_manure', 'coffee_husks', 'rice_hulls', 'maize_stalks', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waste_status') THEN
        CREATE TYPE public.waste_status AS ENUM ('reported', 'scheduled', 'collected', 'processed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');
    END IF;
END $$;

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
ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

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

-- Create triggers for updated_at
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