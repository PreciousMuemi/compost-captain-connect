-- Add product sales functionality to payments table
ALTER TABLE public.payments 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Update payment_type to include product sales
UPDATE public.payments 
SET payment_type = 'waste_purchase' 
WHERE payment_type = 'mpesa' OR payment_type IS NULL;

-- Add policy for customers to view their own payments
CREATE POLICY "Customers can view their own payments" 
ON public.payments 
FOR SELECT 
USING (customer_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.customers 
  WHERE customers.id = payments.customer_id 
  AND customers.phone_number = auth.jwt() ->> 'phone'
));