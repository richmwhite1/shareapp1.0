// Simple script to add test hashtags via API
import fetch from 'node-fetch';

async function addTestHashtags() {
  try {
    // Login as alice to get token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('Logged in, token:', token ? 'received' : 'failed');
    
    if (!token) {
      console.error('Failed to get token');
      return;
    }
    
    // Create a test post with football and byu hashtags
    const postResponse = await fetch('http://localhost:5000/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        hashtags: '#football #byu #sports #test',
        primaryDescription: 'Test post for hashtag search - Go BYU Cougars! #football #byu',
        primaryPhotoUrl: 'https://picsum.photos/400/300',
        listId: 1,
        privacy: 'public'
      })
    });
    
    const postData = await postResponse.json();
    console.log('Created test post:', postData);
    
    // Test search immediately
    const searchResponse = await fetch('http://localhost:5000/api/search/hashtags?tags=football,byu');
    const searchResults = await searchResponse.json();
    console.log('Search results for football,byu:', searchResults.length, 'posts');
    
    // Test individual hashtag searches
    const footballResponse = await fetch('http://localhost:5000/api/search/hashtags?tags=football');
    const footballResults = await footballResponse.json();
    console.log('Search results for football:', footballResults.length, 'posts');
    
    const byuResponse = await fetch('http://localhost:5000/api/search/hashtags?tags=byu');
    const byuResults = await byuResponse.json();
    console.log('Search results for byu:', byuResults.length, 'posts');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addTestHashtags();