import { db } from './server/db.js';
import { hashtags, posts, postHashtags, users, lists } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function createEmilyHashtags() {
  try {
    console.log('Creating football and byu hashtags...');
    
    // Create the hashtags
    const [footballHashtag] = await db.insert(hashtags)
      .values({ name: 'football' })
      .onConflictDoNothing()
      .returning();
    
    const [byuHashtag] = await db.insert(hashtags)
      .values({ name: 'byu' })
      .onConflictDoNothing()
      .returning();
    
    console.log('Hashtags created:', { footballHashtag, byuHashtag });
    
    // Get Emily's user ID
    const [emily] = await db.select().from(users).where(eq(users.username, 'Emily'));
    if (!emily) {
      console.log('Emily user not found');
      return;
    }
    
    // Get Emily's list
    const [emilyList] = await db.select().from(lists).where(eq(lists.userId, emily.id));
    if (!emilyList) {
      console.log('Emily list not found');
      return;
    }
    
    console.log('Found Emily:', emily.id, 'List:', emilyList.id);
    
    // Create a test post with hashtags for Emily
    const [testPost] = await db.insert(posts).values({
      userId: emily.id,
      listId: emilyList.id,
      primaryPhotoUrl: 'https://example.com/football.jpg',
      primaryDescription: 'Go BYU football! #football #byu #sports',
      privacy: 'public'
    }).returning();
    
    console.log('Created test post:', testPost.id);
    
    // Associate hashtags with the post
    if (footballHashtag) {
      await db.insert(postHashtags).values({
        postId: testPost.id,
        hashtagId: footballHashtag.id
      }).onConflictDoNothing();
    }
    
    if (byuHashtag) {
      await db.insert(postHashtags).values({
        postId: testPost.id,
        hashtagId: byuHashtag.id
      }).onConflictDoNothing();
    }
    
    console.log('Associated hashtags with post');
    
    // Test the search functionality
    console.log('\nTesting search functionality...');
    
    // Check if hashtags appear in trending
    const trendingResult = await db.select().from(hashtags);
    console.log('All hashtags in database:', trendingResult.map(h => h.name));
    
    console.log('Emily hashtags setup complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

createEmilyHashtags();