-- Add farm_type, id_number, and farm_size columns to profiles table
-- Run this in Supabase Dashboard > SQL Editor

-- Add farm_type column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS farm_type TEXT;

-- Add id_number column  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Add farm_size column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS farm_size DECIMAL(10,2);

-- Add comments to explain the new fields
COMMENT ON COLUMN public.profiles.farm_type IS 'Type of farm: dairy, coffee, maize, mixed, other';
COMMENT ON COLUMN public.profiles.id_number IS 'Farmer ID number';
COMMENT ON COLUMN public.profiles.farm_size IS 'Farm size in acres';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_farm_type ON public.profiles(farm_type);
CREATE INDEX IF NOT EXISTS idx_profiles_id_number ON public.profiles(id_number);

-- Update existing profiles to have default values if null
UPDATE public.profiles 
SET farm_type = 'mixed' 
WHERE farm_type IS NULL AND role = 'farmer';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('farm_type', 'id_number', 'farm_size'); 