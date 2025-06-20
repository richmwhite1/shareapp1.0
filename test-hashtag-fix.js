import { db } from './server/db.js';
import { posts, hashtags, postHashtags, users, lists } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testHashtagCreation() {
  try {
    console.log('Testing hashtag creation and linking...');
    
    // Get Richard's user ID
    const [richard] = await db.select().from(users).where(eq(users.username, 'Richardpants')).limit(1);
    if (!richard) {
      console.error('Richard not found');
      return;
    }
    
    // Get one of Richard's lists
    const [list] = await db.select().from(lists).where(eq(lists.userId, richard.id)).limit(1);
    if (!list) {
      console.error('No list found for Richard');
      return;
    }
    
    console.log('Found Richard:', richard.id, 'List:', list.id);
    
    // Create a test post directly
    const [testPost] = await db.insert(posts).values({
      userId: richard.id,
      listId: list.id,
      primaryPhotoUrl: 'https://picsum.photos/400/300?test=1',
      primaryLink: 'https://example.com/test',
      primaryDescription: 'Test post with hashtags #testing #bitcoin #rally',
      privacy: 'public'
    }).returning();
    
    console.log('Created test post:', testPost.id);
    
    // Create hashtags
    const hashtagNames = ['testing', 'bitcoin', 'rally'];
    
    for (const name of hashtagNames) {
      // Create or get hashtag
      let hashtag = await db.select().from(hashtags).where(eq(hashtags.name, name)).limit(1);
      if (hashtag.length === 0) {
        const [newHashtag] = await db.insert(hashtags).values({ name }).returning();
        hashtag = [newHashtag];
        console.log('Created new hashtag:', name, newHashtag.id);
      } else {
        console.log('Found existing hashtag:', name, hashtag[0].id);
      }
      
      // Link hashtag to post
      await db.insert(postHashtags).values({
        postId: testPost.id,
        hashtagId: hashtag[0].id
      }).onConflictDoNothing();
      
      console.log('Linked hashtag', name, 'to post', testPost.id);
    }
    
    // Verify hashtag links
    const linkedHashtags = await db
      .select({
        hashtagName: hashtags.name,
        postId: postHashtags.postId
      })
      .from(postHashtags)
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(eq(postHashtags.postId, testPost.id));
    
    console.log('Linked hashtags:', linkedHashtags);
    
    // Test search
    const searchUrl = `http://localhost:5000/api/search/hashtags?tags=testing,bitcoin`;
    console.log('Testing search URL:', searchUrl);
    
    const searchResponse = await fetch(searchUrl);
    const searchResults = await searchResponse.json();
    console.log('Search results:', searchResults.length, 'posts found');
    
    if (searchResults.length > 0) {
      console.log('First result:', searchResults[0].id, searchResults[0].primaryDescription);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testHashtagCreation();