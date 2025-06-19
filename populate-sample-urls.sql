-- Insert sample URL data to demonstrate the URL management system
INSERT INTO url_clicks (url, user_id, post_id, clicked_at) VALUES
('https://amazon.com/dp/B08N5WRWNW', 1, 1, NOW() - INTERVAL '1 day'),
('https://amazon.com/dp/B08N5WRWNW', 2, 1, NOW() - INTERVAL '2 hours'),
('https://target.com/p/electronics/-/A-54321', 3, 2, NOW() - INTERVAL '3 hours'),
('https://target.com/p/electronics/-/A-54321', 1, 2, NOW() - INTERVAL '4 hours'),
('https://etsy.com/listing/987654321/handmade-jewelry', 2, 3, NOW() - INTERVAL '5 hours'),
('https://walmart.com/ip/Home-Garden/123456789', 3, 4, NOW() - INTERVAL '6 hours'),
('https://bestbuy.com/site/tech-gadgets/6789012', 1, 5, NOW() - INTERVAL '1 day'),
('https://bestbuy.com/site/tech-gadgets/6789012', 2, 5, NOW() - INTERVAL '8 hours');

-- Update some posts to include these URLs in primaryLink
UPDATE posts SET primary_link = 'https://amazon.com/dp/B08N5WRWNW' WHERE id = 1;
UPDATE posts SET primary_link = 'https://target.com/p/electronics/-/A-54321' WHERE id = 2;
UPDATE posts SET primary_link = 'https://etsy.com/listing/987654321/handmade-jewelry' WHERE id = 3;
UPDATE posts SET primary_link = 'https://walmart.com/ip/Home-Garden/123456789' WHERE id = 4;
UPDATE posts SET primary_link = 'https://bestbuy.com/site/tech-gadgets/6789012' WHERE id = 5;

-- Add sample URL mappings for demonstration
INSERT INTO url_mappings (original_url, current_url, discount_code, is_active) VALUES
('https://amazon.com/dp/B08N5WRWNW', 'https://amazon.com/dp/B08N5WRWNW?tag=affiliate123', 'SAVE20', true),
('https://target.com/p/electronics/-/A-54321', 'https://target.com/p/electronics/-/A-54321?utm_source=affiliate', 'TARGET15', true);