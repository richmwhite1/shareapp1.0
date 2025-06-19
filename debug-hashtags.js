const { db } = require('./server/db.ts');
const { posts, users, hashtags } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function debugHashtags() {
  try {
    // Check Emily's posts
    console.log('=== Emily\'s Posts ===');
    const emilyPosts = await db.select({
      id: posts.id,
      content: posts.content,
      hashtags: posts.hashtags,
      createdAt: posts.createdAt
    }).from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(eq(users.username, 'Emily'))
    .orderBy(posts.createdAt);
    
    console.log(JSON.stringify(emilyPosts, null, 2));
    
    // Check all hashtags
    console.log('\n=== All Hashtags ===');
    const allHashtags = await db.select().from(hashtags).orderBy(hashtags.name);
    console.log(JSON.stringify(allHashtags, null, 2));
    
    // Check for football and byu hashtags specifically
    console.log('\n=== Football/BYU Search ===');
    const footballHashtag = await db.select().from(hashtags).where(eq(hashtags.name, 'football'));
    const byuHashtag = await db.select().from(hashtags).where(eq(hashtags.name, 'byu'));
    console.log('Football:', footballHashtag);
    console.log('BYU:', byuHashtag);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

debugHashtags();