-- Update Product Images with Organic Fertilizers and Pellets
-- Run this in Supabase Dashboard > SQL Editor

-- Clear existing products to start fresh
DELETE FROM public.products;

-- Insert products with proper organic fertilizer and pellet images
INSERT INTO public.products (name, description, price, image_url) VALUES
('Organic Compost', 'Premium organic compost made from farm waste', 50, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
('Chicken Manure', 'High-quality chicken manure fertilizer', 80, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop'),
('Vermicompost', 'Nutrient-rich vermicompost for healthy plants', 60, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'),
('Cow Manure', 'Natural cow manure for soil enrichment', 45, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
('Organic Fertilizer', 'Balanced organic fertilizer for crops', 70, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
('Organic Pellets', 'Concentrated organic fertilizer pellets', 90, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
('NPK Fertilizer', 'Complete nutrient blend for all crops', 85, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
('Organic Granules', 'Slow-release organic fertilizer granules', 75, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'),
('Bio Fertilizer', 'Natural bio-fertilizer for organic farming', 65, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'),
('Organic Pellets Premium', 'High-grade organic fertilizer pellets', 95, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop');

-- Verify the products were inserted
SELECT name, price, image_url FROM public.products ORDER BY name; 