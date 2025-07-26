-- Fix Product Images with Organic Fertilizers and Pellets
-- Run this in Supabase Dashboard > SQL Editor

-- Update products with organic fertilizer and pellet images
UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'
WHERE name ILIKE '%compost%' OR name ILIKE '%manure%';

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'
WHERE name ILIKE '%organic%' OR name ILIKE '%fertilizer%';

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'
WHERE name ILIKE '%vermi%' OR name ILIKE '%worm%';

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop'
WHERE name ILIKE '%chicken%' OR name ILIKE '%poultry%';

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'
WHERE name ILIKE '%cow%' OR name ILIKE '%dairy%';

-- Update with organic fertilizer and pellet specific images
UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'
WHERE name ILIKE '%pellet%' OR name ILIKE '%granule%';

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'
WHERE name ILIKE '%organic%' AND (name ILIKE '%fertilizer%' OR name ILIKE '%nutrient%');

UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'
WHERE image_url IS NULL OR image_url = '';

-- Insert sample products with organic fertilizers and pellets if table is empty
INSERT INTO public.products (name, description, price, image_url)
SELECT * FROM (VALUES 
    ('Organic Compost', 'Premium organic compost made from farm waste', 50, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
    ('Chicken Manure', 'High-quality chicken manure fertilizer', 80, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop'),
    ('Vermicompost', 'Nutrient-rich vermicompost for healthy plants', 60, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'),
    ('Cow Manure', 'Natural cow manure for soil enrichment', 45, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
    ('Organic Fertilizer', 'Balanced organic fertilizer for crops', 70, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
    ('Organic Pellets', 'Concentrated organic fertilizer pellets', 90, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
    ('NPK Fertilizer', 'Complete nutrient blend for all crops', 85, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
    ('Organic Granules', 'Slow-release organic fertilizer granules', 75, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop')
) AS v(name, description, price, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.products); 