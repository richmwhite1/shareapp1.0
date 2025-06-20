const { db } = require('./server/db.ts');
const { posts, hashtags, postHashtags } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function testHashtagCreation() {
  try {
    console.log('Testing hashtag creation for new posts...');
    
    // Get the most recent post
    const recentPosts = await db.select().from(posts).orderBy(posts.createdAt.desc()).limit(1);
    
    if (recentPosts.length === 0) {
      console.log('No posts found');
      return;
    }
    
    const post = recentPosts[0];
    console.log(`Recent post ID: ${post.id}, Description: ${post.primaryDescription}`);
    
    // Check if this post has hashtags
    const postHashtagsData = await db
      .select({
        hashtag: hashtags,
        postHashtag: postHashtags
      })
      .from(postHashtags)
      .leftJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(eq(postHashtags.postId, post.id));
    
    console.log(`Hashtags for post ${post.id}:`, postHashtagsData);
    
    if (postHashtagsData.length === 0) {
      console.log('❌ No hashtags found for recent post');
      
      // Try to manually create hashtags for this post to test the system
      console.log('Creating test hashtags...');
      
      const testHashtags = ['test', 'debug', 'fix'];
      
      for (const tagName of testHashtags) {
        // Create or get hashtag
        let hashtag = await db.select().from(hashtags).where(eq(hashtags.name, tagName)).limit(1);
        
        if (hashtag.length === 0) {
          const [newHashtag] = await db.insert(hashtags).values({ name: tagName }).returning();
          hashtag = [newHashtag];
        }
        
        // Link to post
        await db.insert(postHashtags).values({
          postId: post.id,
          hashtagId: hashtag[0].id
        }).onConflictDoNothing();
        
        console.log(`✓ Created hashtag link: ${tagName} -> Post ${post.id}`);
      }
      
      // Verify hashtags were created
      const verifyHashtags = await db
        .select({
          hashtag: hashtags,
          postHashtag: postHashtags
        })
        .from(postHashtags)
        .leftJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
        .where(eq(postHashtags.postId, post.id));
      
      console.log(`Verification - Hashtags for post ${post.id}:`, verifyHashtags);
      
    } else {
      console.log('✓ Hashtags found for recent post');
    }
    
    // Check all hashtags in the system
    const allHashtags = await db.select().from(hashtags);
    console.log(`Total hashtags in system: ${allHashtags.length}`);
    
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Error testing hashtag creation:', error);
  }
}

testHashtagCreation();