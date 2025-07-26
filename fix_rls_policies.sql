-- Fix RLS Policies for Orders and Customers
-- Run this in Supabase Dashboard > SQL Editor

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admin and dispatch can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admin and dispatch can manage customers" ON public.customers;

-- Create new policies for orders
CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE customers.id = orders.customer_id
            AND customers.phone_number = (
                SELECT phone_number FROM public.profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admin and dispatch can view all orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('admin', 'dispatch')
        )
    );

CREATE POLICY "Admin and dispatch can update orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('admin', 'dispatch')
        )
    );

-- Create new policies for customers
CREATE POLICY "Users can create customers" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own customer record" ON public.customers
    FOR SELECT USING (
        phone_number = (
            SELECT phone_number FROM public.profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admin and dispatch can manage customers" ON public.customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('admin', 'dispatch')
        )
    );

-- Create policies for order_items
CREATE POLICY "Users can create order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            JOIN public.customers ON customers.id = orders.customer_id
            WHERE orders.id = order_items.order_id
            AND customers.phone_number = (
                SELECT phone_number FROM public.profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admin and dispatch can manage order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('admin', 'dispatch')
        )
    );

-- Enable RLS on order_items if not already enabled
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY; 