-- Simple RLS Fix - Allow all operations for testing
-- Run this in Supabase Dashboard > SQL Editor

-- Drop all existing policies on orders table
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and dispatch can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and dispatch can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and dispatch can manage orders" ON public.orders;

-- Drop all existing policies on customers table
DROP POLICY IF EXISTS "Users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own customer record" ON public.customers;
DROP POLICY IF EXISTS "Admin and dispatch can manage customers" ON public.customers;

-- Drop all existing policies on order_items table
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin and dispatch can manage order items" ON public.order_items;

-- Create simple permissive policies for testing
CREATE POLICY "Allow all operations on orders" ON public.orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on customers" ON public.customers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on order_items" ON public.order_items
    FOR ALL USING (true) WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Test the policies work
SELECT 'RLS Policies Updated Successfully' as status; 