import { db } from './server/db.js';
import { hashtags, posts, postHashtags } from './shared/schema.js';

async function createTestHashtags() {
  try {
    // Create football and byu hashtags directly
    console.log('Creating test hashtags...');
    
    const [footballHashtag] = await db.insert(hashtags).values({
      name: 'football'
    }).returning().catch(() => []);
    
    const [byuHashtag] = await db.insert(hashtags).values({
      name: 'byu'
    }).returning().catch(() => []);
    
    console.log('Created hashtags:', { footballHashtag, byuHashtag });
    
    // Now check if they appear in search
    const response = await fetch('http://localhost:5000/api/hashtags/trending');
    const trending = await response.json();
    console.log('Trending hashtags:', trending);
    
    // Test search with these hashtags
    const searchResponse = await fetch('http://localhost:5000/api/search/hashtags?tags=football,byu');
    const searchResults = await searchResponse.json();
    console.log('Search results:', searchResults);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

createTestHashtags();