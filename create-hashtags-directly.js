import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createHashtags() {
  try {
    console.log('Creating hashtags...');
    
    // Create hashtags
    await sql`INSERT INTO hashtags (name) VALUES ('football') ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO hashtags (name) VALUES ('byu') ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO hashtags (name) VALUES ('sports') ON CONFLICT (name) DO NOTHING`;
    
    console.log('Hashtags created successfully');
    
    // Get Emily's user ID (using EmilyRocks)
    let emily = await sql`SELECT id, username FROM users WHERE username = 'EmilyRocks'`;
    if (emily.length === 0) {
      console.log('EmilyRocks user not found');
      return;
    }
    emily = emily[0];
    console.log('Found Emily:', emily.username, emily.id);
    
    // Get Emily's list
    const [emilyList] = await sql`SELECT id FROM lists WHERE user_id = ${emily.id} LIMIT 1`;
    if (!emilyList) {
      console.log('Emily list not found, creating one...');
      const [newList] = await sql`
        INSERT INTO lists (user_id, name, description, is_public, privacy_level) 
        VALUES (${emily.id}, 'General', 'General list', true, 'public') 
        RETURNING id
      `;
      emilyList = newList;
    }
    
    // Create a test post for Emily
    const [newPost] = await sql`
      INSERT INTO posts (user_id, list_id, primary_photo_url, primary_description, privacy, created_at)
      VALUES (${emily.id}, ${emilyList.id}, 'https://picsum.photos/400/300?random=1', 
              'Go BYU Cougars! Love watching football games! #football #byu #sports', 
              'public', NOW())
      RETURNING id
    `;
    
    console.log('Created post:', newPost.id);
    
    // Link hashtags to the post
    const hashtags = await sql`SELECT id, name FROM hashtags WHERE name IN ('football', 'byu', 'sports')`;
    
    for (const hashtag of hashtags) {
      await sql`
        INSERT INTO post_hashtags (post_id, hashtag_id) 
        VALUES (${newPost.id}, ${hashtag.id})
        ON CONFLICT DO NOTHING
      `;
    }
    
    console.log('Linked hashtags to post');
    
    // Verify the hashtags exist
    const result = await sql`SELECT name FROM hashtags WHERE name IN ('football', 'byu', 'sports')`;
    console.log('Created hashtags:', result.map(r => r.name));
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

createHashtags();