-- Create missing hashtags that Emily mentioned
INSERT INTO hashtags (name) VALUES ('football') ON CONFLICT (name) DO NOTHING;
INSERT INTO hashtags (name) VALUES ('byu') ON CONFLICT (name) DO NOTHING;
INSERT INTO hashtags (name) VALUES ('sports') ON CONFLICT (name) DO NOTHING;

-- Create a test post for Emily with these hashtags
INSERT INTO posts (
    "userId", 
    "listId", 
    "primaryPhotoUrl", 
    "primaryDescription", 
    privacy,
    "createdAt"
) VALUES (
    (SELECT id FROM users WHERE username = 'Emily'),
    (SELECT id FROM lists WHERE "userId" = (SELECT id FROM users WHERE username = 'Emily') LIMIT 1),
    'https://picsum.photos/400/300?random=1',
    'Go BYU Cougars! Love watching football games! #football #byu #sports',
    'public',
    NOW()
) RETURNING id;

-- Link the hashtags to the post (we'll use the last inserted post ID)
INSERT INTO post_hashtags ("postId", "hashtagId") VALUES 
    ((SELECT MAX(id) FROM posts), (SELECT id FROM hashtags WHERE name = 'football')),
    ((SELECT MAX(id) FROM posts), (SELECT id FROM hashtags WHERE name = 'byu')),
    ((SELECT MAX(id) FROM posts), (SELECT id FROM hashtags WHERE name = 'sports'));

-- Check that hashtags now exist
SELECT name FROM hashtags WHERE name IN ('football', 'byu', 'sports');