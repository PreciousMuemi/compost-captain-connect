-- Fix Dispatch System Data Issues
-- This migration addresses all the data problems mentioned

-- First, let's ensure we have the correct inventory table structure
DROP TABLE IF EXISTS public.inventory CASCADE;
CREATE TABLE public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'kg',
  last_restocked DATE,
  price_per_unit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure riders table exists with correct structure
CREATE TABLE IF NOT EXISTS public.riders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
  current_orders INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.0,
  last_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure customers table exists
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  location TEXT,
  is_farmer BOOLEAN DEFAULT false,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure orders table has all required columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_rider UUID REFERENCES public.riders(id),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Ensure waste_reports table has all required columns
ALTER TABLE public.waste_reports 
ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id),
ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_completed_at TIMESTAMP WITH TIME ZONE;

-- Insert sample riders
INSERT INTO public.riders (name, phone_number, vehicle_type, status, total_deliveries, success_rate, last_location)
VALUES 
  ('John Kimani', '+254701234567', 'Motorcycle', 'available', 245, 96.5, 'Nairobi CBD'),
  ('Mary Wanjiku', '+254707654321', 'Van', 'busy', 189, 98.2, 'Kiambu'),
  ('David Ochieng', '+254712345678', 'Truck', 'available', 156, 94.8, 'Thika'),
  ('Grace Nyambura', '+254723456789', 'Motorcycle', 'available', 203, 97.1, 'Nakuru'),
  ('Peter Mwangi', '+254734567890', 'Van', 'offline', 178, 95.3, 'Eldoret')
ON CONFLICT DO NOTHING;

-- Insert sample inventory items
INSERT INTO public.inventory (name, stock_quantity, low_stock_threshold, unit, last_restocked, price_per_unit)
VALUES 
  ('Organic Manure Pellets', 150, 50, 'kg', '2024-01-15', 80.00),
  ('Processed Organic Manure', 25, 30, 'kg', '2024-01-10', 50.00),
  ('Fertilizer Powder', 200, 40, 'kg', '2024-01-18', 120.00),
  ('Compost Mix', 75, 25, 'kg', '2024-01-12', 60.00),
  ('Bio-fertilizer Liquid', 40, 15, 'liters', '2024-01-16', 150.00)
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO public.customers (name, phone_number, location, is_farmer)
VALUES 
  ('Sarah Johnson', '+254700123456', 'Nairobi West', false),
  ('Michael Ochieng', '+254700234567', 'Kiambu Town', false),
  ('Jane Wambui', '+254700345678', 'Thika Road', false),
  ('Robert Kiprop', '+254700456789', 'Nakuru City', false),
  ('Alice Muthoni', '+254700567890', 'Eldoret Town', false)
ON CONFLICT DO NOTHING;

-- Insert sample orders
INSERT INTO public.orders (customer_id, quantity_kg, price_per_kg, total_amount, status, delivery_address)
SELECT 
  c.id,
  FLOOR(RANDOM() * 50 + 10)::INTEGER,
  FLOOR(RANDOM() * 100 + 50)::DECIMAL,
  (FLOOR(RANDOM() * 50 + 10) * (FLOOR(RANDOM() * 100 + 50)))::DECIMAL,
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'confirmed'
    ELSE 'delivered'
  END,
  c.location
FROM public.customers c
LIMIT 10;

-- Insert sample waste reports
INSERT INTO public.waste_reports (farmer_id, waste_type, quantity_kg, status, location)
SELECT 
  p.id,
  CASE (RANDOM() * 4)::INTEGER
    WHEN 0 THEN 'animal_manure'
    WHEN 1 THEN 'coffee_husks'
    WHEN 2 THEN 'rice_hulls'
    WHEN 3 THEN 'maize_stalks'
    ELSE 'other'
  END,
  FLOOR(RANDOM() * 100 + 20)::DECIMAL,
  CASE (RANDOM() * 3)::INTEGER
    WHEN 0 THEN 'reported'
    WHEN 1 THEN 'scheduled'
    ELSE 'collected'
  END,
  p.location
FROM public.profiles p
WHERE p.role = 'farmer'
LIMIT 15;

-- Insert sample admin tasks
INSERT INTO public.admin_tasks (title, description, priority, status)
VALUES
  ('Review Low Stock Items', 'Check inventory levels and restock items below threshold', 'high', 'pending'),
  ('Monitor Rider Performance', 'Track delivery success rates and rider efficiency', 'medium', 'pending'),
  ('Update Delivery Routes', 'Optimize delivery routes based on recent orders', 'low', 'pending'),
  ('Customer Feedback Review', 'Review and respond to customer feedback', 'medium', 'pending'),
  ('System Maintenance', 'Perform routine system checks and updates', 'low', 'pending'),
  ('Waste Collection Schedule', 'Plan weekly waste collection routes', 'high', 'pending'),
  ('Farmer Payment Processing', 'Process payments for collected waste', 'high', 'pending'),
  ('Quality Control Check', 'Verify compost quality standards', 'medium', 'pending')
ON CONFLICT DO NOTHING;

-- Insert sample notifications
INSERT INTO public.notifications (type, title, message)
VALUES
  ('low_stock', 'Low Stock Alert', 'Organic Manure Pellets are running low (25kg remaining)'),
  ('general', 'System Update', 'New features have been added to the dispatch system'),
  ('rider_issue', 'Rider Assignment', 'New waste pickup assigned to John Kimani'),
  ('general', 'Payment Processed', 'Payment of KES 2,500 processed for waste collection'),
  ('low_stock', 'Low Stock Alert', 'Fertilizer Powder needs restocking (15kg remaining)')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_rider ON public.orders(assigned_rider);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_waste_reports_status ON public.waste_reports(status);
CREATE INDEX IF NOT EXISTS idx_waste_reports_farmer_id ON public.waste_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_riders_status ON public.riders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(stock_quantity, low_stock_threshold);

-- Enable RLS
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispatch role
CREATE POLICY "Dispatch can view all riders" ON public.riders
  FOR SELECT USING (true);

CREATE POLICY "Dispatch can manage riders" ON public.riders
  FOR ALL USING (true);

CREATE POLICY "Dispatch can view inventory" ON public.inventory
  FOR SELECT USING (true);

CREATE POLICY "Dispatch can manage inventory" ON public.inventory
  FOR ALL USING (true);

CREATE POLICY "Dispatch can view customers" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Dispatch can manage customers" ON public.customers
  FOR ALL USING (true);

CREATE POLICY "Dispatch can view notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "Dispatch can manage notifications" ON public.notifications
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON public.riders TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.waste_reports TO authenticated;
GRANT ALL ON public.admin_tasks TO authenticated;

-- Create function to update rider stats when order status changes
CREATE OR REPLACE FUNCTION update_rider_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is being assigned to a rider
  IF NEW.assigned_rider IS NOT NULL AND (OLD.assigned_rider IS NULL OR OLD.assigned_rider != NEW.assigned_rider) THEN
    UPDATE public.riders 
    SET current_orders = current_orders + 1
    WHERE id = NEW.assigned_rider;
  END IF;
  
  -- If order status changes to delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.assigned_rider IS NOT NULL THEN
    UPDATE public.riders 
    SET 
      current_orders = current_orders - 1,
      total_deliveries = total_deliveries + 1
    WHERE id = NEW.assigned_rider;
  END IF;
  
  -- If order status changes to cancelled or failed
  IF NEW.status IN ('cancelled', 'failed') AND OLD.status NOT IN ('cancelled', 'failed') AND NEW.assigned_rider IS NOT NULL THEN
    UPDATE public.riders 
    SET current_orders = current_orders - 1
    WHERE id = NEW.assigned_rider;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rider stats updates
DROP TRIGGER IF EXISTS update_rider_stats_trigger ON public.orders;
CREATE TRIGGER update_rider_stats_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_stats();

-- Create function to automatically create notifications for low stock
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.low_stock_threshold AND 
     (OLD IS NULL OR OLD.stock_quantity > OLD.low_stock_threshold) THEN
    
    INSERT INTO public.notifications (type, title, message)
    VALUES (
      'low_stock',
      'Low Stock Alert',
      'Item "' || NEW.name || '" is below threshold (' || NEW.stock_quantity || ' ' || NEW.unit || ' remaining)'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for low stock notifications
DROP TRIGGER IF EXISTS low_stock_notification ON public.inventory;
CREATE TRIGGER low_stock_notification
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock(); 