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

-- Add processing_batches table for supply chain traceability
CREATE TABLE public.processing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT UNIQUE NOT NULL,
    waste_report_ids UUID[] NOT NULL,
    total_input_weight DECIMAL(10,2) NOT NULL,
    total_output_weight DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'drying', 'crushing', 'cleaning', 'pelletizing', 'packaged', 'completed')),
    qr_code TEXT UNIQUE,
    traceability_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add batch_id to waste_reports for linking
ALTER TABLE public.waste_reports 
ADD COLUMN batch_id UUID REFERENCES public.processing_batches(id);

-- Add processing_steps table for detailed tracking
CREATE TABLE public.processing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.processing_batches(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    operator_id UUID REFERENCES public.profiles(id),
    quality_metrics JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add products table for final pellets
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.processing_batches(id),
    name TEXT NOT NULL,
    description TEXT,
    price_per_kg DECIMAL(10,2) NOT NULL,
    available_kg DECIMAL(10,2) DEFAULT 0,
    qr_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add product_orders table for sales
CREATE TABLE public.product_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    customer_id UUID REFERENCES public.customers(id),
    quantity_kg DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
    delivery_address TEXT,
    assigned_rider_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.processing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for processing_batches
CREATE POLICY "Admin and dispatch can manage processing batches" ON public.processing_batches
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

-- RLS Policies for processing_steps
CREATE POLICY "Admin and dispatch can manage processing steps" ON public.processing_steps
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

-- RLS Policies for products
CREATE POLICY "Admin and dispatch can manage products" ON public.products
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

CREATE POLICY "Everyone can view products" ON public.products
    FOR SELECT USING (true);

-- RLS Policies for product_orders
CREATE POLICY "Admin and dispatch can manage product orders" ON public.product_orders
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'dispatch')
    );

CREATE POLICY "Customers can view their own orders" ON public.product_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = product_orders.customer_id
            AND customers.phone_number = (
                SELECT phone_number FROM public.profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Create triggers for updated_at
CREATE TRIGGER update_processing_batches_updated_at
    BEFORE UPDATE ON public.processing_batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_orders_updated_at
    BEFORE UPDATE ON public.product_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add function to generate QR codes
CREATE OR REPLACE FUNCTION public.generate_qr_code(batch_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'QR-BATCH-' || batch_number || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
END;
$$;

-- Add function to create product from completed batch
CREATE OR REPLACE FUNCTION public.create_product_from_batch(batch_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    product_id UUID;
    batch_record RECORD;
BEGIN
    SELECT * INTO batch_record FROM public.processing_batches WHERE id = batch_id;
    
    IF batch_record.status != 'completed' THEN
        RAISE EXCEPTION 'Batch must be completed before creating product';
    END IF;
    
    INSERT INTO public.products (
        batch_id,
        name,
        description,
        price_per_kg,
        available_kg,
        qr_code
    ) VALUES (
        batch_id,
        'Organic Manure Pellets',
        'High-quality organic manure pellets made from farm waste',
        50.00, -- Default price per kg
        batch_record.total_output_weight,
        batch_record.qr_code
    ) RETURNING id INTO product_id;
    
    RETURN product_id;
END;
$$;