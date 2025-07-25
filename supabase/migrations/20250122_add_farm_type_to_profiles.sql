-- Add farm_type column to profiles table for enhanced farmer registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS farm_type TEXT;

-- Add comment to explain the farm_type field
COMMENT ON COLUMN public.profiles.farm_type IS 'Type of farm: dairy, coffee, maize, mixed, other';

-- Create an index on farm_type for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_farm_type ON public.profiles(farm_type);

-- Update existing profiles to have a default farm_type if null
UPDATE public.profiles 
SET farm_type = 'mixed' 
WHERE farm_type IS NULL AND role = 'farmer'; 