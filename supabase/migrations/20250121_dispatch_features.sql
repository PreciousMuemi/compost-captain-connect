-- Enhanced Dispatch Dashboard Database Structure

-- Create riders table
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

-- Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
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

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'failed_delivery', 'rider_issue', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create delivery_logs table for tracking delivery history
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  rider_id UUID REFERENCES public.riders(id),
  status TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create returns_tracking table for sustainability
CREATE TABLE IF NOT EXISTS public.returns_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('plastic_bag', 'sack', 'container')),
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'unusable')),
  returned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create revenue_tracking table
CREATE TABLE IF NOT EXISTS public.revenue_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0.0,
  commission_amount DECIMAL(10,2) DEFAULT 0.0,
  net_revenue DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns to existing orders table if they don't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_rider UUID REFERENCES public.riders(id),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Update orders status enum to include new statuses
ALTER TABLE public.orders 
ALTER COLUMN status TYPE TEXT;

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
CREATE TRIGGER low_stock_notification
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

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
    
    -- Log the delivery
    INSERT INTO public.delivery_logs (order_id, rider_id, status, notes)
    VALUES (NEW.id, NEW.assigned_rider, 'delivered', NEW.delivery_notes);
  END IF;
  
  -- If order status changes to cancelled or failed
  IF NEW.status IN ('cancelled', 'failed') AND OLD.status NOT IN ('cancelled', 'failed') AND NEW.assigned_rider IS NOT NULL THEN
    UPDATE public.riders 
    SET current_orders = current_orders - 1
    WHERE id = NEW.assigned_rider;
    
    -- Create notification for failed delivery
    IF NEW.status = 'failed' THEN
      INSERT INTO public.notifications (type, title, message)
      VALUES (
        'failed_delivery',
        'Failed Delivery',
        'Order #' || substring(NEW.id::text from 1 for 8) || ' delivery failed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rider stats updates
CREATE TRIGGER update_rider_stats_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_stats();

-- Create function to calculate success rates
CREATE OR REPLACE FUNCTION calculate_rider_success_rates()
RETURNS void AS $$
BEGIN
  UPDATE public.riders
  SET success_rate = (
    SELECT CASE 
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE (COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*))
    END
    FROM public.delivery_logs
    WHERE rider_id = riders.id
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_rider ON public.orders(assigned_rider);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_rider_id ON public.delivery_logs(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_order_id ON public.delivery_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(stock_quantity, low_stock_threshold);

-- Enable RLS (Row Level Security)
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispatch role
CREATE POLICY "Dispatch can view all riders" ON public.riders
  FOR SELECT USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Dispatch can manage riders" ON public.riders
  FOR ALL USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Dispatch can view inventory" ON public.inventory
  FOR SELECT USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Dispatch can manage inventory" ON public.inventory
  FOR ALL USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Dispatch can view notifications" ON public.notifications
  FOR SELECT USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Dispatch can manage notifications" ON public.notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'dispatch' OR auth.jwt() ->> 'role' = 'admin');

-- Grant necessary permissions
GRANT ALL ON public.riders TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.delivery_logs TO authenticated;
GRANT ALL ON public.returns_tracking TO authenticated;
GRANT ALL ON public.revenue_tracking TO authenticated;
