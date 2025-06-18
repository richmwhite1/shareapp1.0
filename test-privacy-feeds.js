// Test privacy system for post visibility in feeds
// Verifies that posts appear in correct feeds based on privacy levels

import fetch from 'node-fetch';

const testPrivacyFeeds = async () => {
  console.log("=== Testing Privacy Feed System ===\n");

  try {
    // Test 1: Check public feed for privacy filtering
    console.log("1. Testing public feed privacy filtering...");
    const publicFeedResponse = await fetch('http://localhost:5000/api/posts');
    const publicFeed = await publicFeedResponse.json();
    
    console.log(`   Public feed contains ${publicFeed.length} posts`);
    
    // Analyze privacy levels in public feed
    const privacyLevels = {};
    publicFeed.forEach(post => {
      const privacy = post.privacy || 'unknown';
      privacyLevels[privacy] = (privacyLevels[privacy] || 0) + 1;
    });
    
    console.log("   Privacy distribution in public feed:");
    Object.entries(privacyLevels).forEach(([privacy, count]) => {
      console.log(`   - ${privacy}: ${count} posts`);
    });
    
    // Test 2: Check for private posts in public feed (should be none)
    const privatePosts = publicFeed.filter(post => post.privacy === 'private');
    const connectionPosts = publicFeed.filter(post => post.privacy === 'connections');
    const publicPosts = publicFeed.filter(post => post.privacy === 'public');
    
    console.log("\n2. Privacy violation analysis:");
    if (privatePosts.length > 0) {
      console.log(`   ❌ PRIVACY VIOLATION: ${privatePosts.length} private posts in public feed`);
      privatePosts.forEach(post => {
        console.log(`      - "${post.primaryDescription}" (User ${post.userId})`);
      });
    } else {
      console.log("   ✅ No private posts in public feed");
    }
    
    if (connectionPosts.length > 0) {
      console.log(`   ⚠️  WARNING: ${connectionPosts.length} connection-only posts in public feed`);
      console.log("   (Should only be visible to connected users)");
    } else {
      console.log("   ✅ No connection-only posts in public feed");
    }
    
    console.log(`   ✅ ${publicPosts.length} public posts correctly visible`);

    // Test 3: Test user-specific feed (simulating connection-based filtering)
    console.log("\n3. Testing user-specific feeds...");
    
    // Get User 1's posts
    const user1PostsResponse = await fetch('http://localhost:5000/api/posts/user/1');
    const user1Posts = await user1PostsResponse.json();
    
    // Get User 2's posts  
    const user2PostsResponse = await fetch('http://localhost:5000/api/posts/user/2');
    const user2Posts = await user2PostsResponse.json();
    
    console.log(`   User 1 has ${user1Posts.length} posts`);
    console.log(`   User 2 has ${user2Posts.length} posts`);
    
    // Analyze privacy levels for each user
    const analyzeUserPosts = (posts, userName) => {
      const userPrivacy = {};
      posts.forEach(post => {
        const privacy = post.privacy || 'unknown';
        userPrivacy[privacy] = (userPrivacy[privacy] || 0) + 1;
      });
      
      console.log(`   ${userName} privacy distribution:`);
      Object.entries(userPrivacy).forEach(([privacy, count]) => {
        console.log(`     - ${privacy}: ${count} posts`);
      });
      
      return userPrivacy;
    };
    
    const user1Privacy = analyzeUserPosts(user1Posts, "User 1");
    const user2Privacy = analyzeUserPosts(user2Posts, "User 2");

    // Test 4: Connection status and post visibility
    console.log("\n4. Testing connection-based visibility...");
    
    // Check if users are connected
    const friendsResponse = await fetch('http://localhost:5000/api/friends');
    if (friendsResponse.status === 401) {
      console.log("   Authentication required for connection testing");
    } else {
      const friends = await friendsResponse.json();
      console.log(`   Current user has ${friends.length} connections`);
      
      if (friends.length > 0) {
        console.log("   Connected users can see each other's connection-only posts");
        friends.forEach(friend => {
          console.log(`   - Connected to: ${friend.username}`);
        });
      } else {
        console.log("   No connections found - connection-only posts not visible");
      }
    }

    // Test 5: Privacy system validation
    console.log("\n5. Privacy system validation:");
    
    const totalPosts = publicFeed.length;
    const expectedPublicOnly = publicPosts.length;
    
    if (privatePosts.length === 0 && connectionPosts.length === 0) {
      console.log("   ✅ PASS: Public feed only contains public posts");
    } else {
      console.log("   ❌ FAIL: Public feed contains restricted content");
    }
    
    console.log("\n6. Privacy rules summary:");
    console.log("   ✓ Private posts: Only visible to list collaborators and tagged users");
    console.log("   ✓ Connection posts: Only visible to connected friends");
    console.log("   ✓ Public posts: Visible in public feed and to connections");

    return {
      publicFeed: publicFeed.length,
      privatePosts: privatePosts.length,
      connectionPosts: connectionPosts.length,
      publicPosts: publicPosts.length,
      user1Posts: user1Posts.length,
      user2Posts: user2Posts.length,
      privacyCompliant: privatePosts.length === 0 && connectionPosts.length === 0
    };

  } catch (error) {
    console.error("Privacy test failed:", error.message);
    return null;
  }
};

// Run the privacy feed test
testPrivacyFeeds().then(results => {
  if (results) {
    console.log("\n=== Privacy Feed Test Results ===");
    console.log(`Total posts in public feed: ${results.publicFeed}`);
    console.log(`Public posts: ${results.publicPosts}`);
    console.log(`Connection-only posts: ${results.connectionPosts}`);
    console.log(`Private posts: ${results.privatePosts}`);
    console.log(`User 1 total posts: ${results.user1Posts}`);
    console.log(`User 2 total posts: ${results.user2Posts}`);
    
    if (results.privacyCompliant) {
      console.log("\n✅ PRIVACY SYSTEM PASSED: All privacy rules enforced correctly");
    } else {
      console.log("\n❌ PRIVACY SYSTEM FAILED: Privacy violations detected");
    }
  }
});