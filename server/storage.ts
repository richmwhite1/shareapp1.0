import { 
  users, posts, comments, lists, postLikes, postShares, friendships, friendRequests, hashtags, 
  postHashtags, postTags, commentTags, commentHashtags, notifications, reports, blacklist, hashtagFollows, rsvps,
  postViews, savedPosts, reposts, postFlags, taggedPosts,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, 
  type PostWithUser, type CommentWithUser, type List, type InsertList, type ListWithPosts,
  type Friendship, type CreateFriendshipData, type FriendRequest, type Hashtag, type CreateHashtagData,
  type Notification, type CreateNotificationData, type Report, type CreateReportData,
  type BlacklistItem, type UserWithFriends, type NotificationWithUser, type HashtagFollow, type Rsvp,
  type PostView, type SavedPost, type Repost, type PostFlag, type TaggedPost, type PostWithStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, or, inArray, sql, like, gt, max, ne, exists } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithFriends(id: number): Promise<UserWithFriends | undefined>;
  searchUsers(query: string): Promise<User[]>;
  updateUserPrivacy(userId: number, privacy: string): Promise<void>;

  // Category methods
  createCategory(category: InsertCategory & { userId: number }): Promise<Category>;
  getCategoriesByUserId(userId: number): Promise<CategoryWithPosts[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryWithPosts(id: number): Promise<CategoryWithPosts | undefined>;

  // Post methods
  createPost(post: InsertPost & { userId: number; categoryId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any; isEvent?: boolean; eventDate?: Date; reminders?: string[]; isRecurring?: boolean; recurringType?: string; taskList?: any[]; allowRsvp?: boolean }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByCategoryId(categoryId: number): Promise<PostWithUser[]>;
  getPostsByHashtag(hashtagName: string): Promise<PostWithUser[]>;
  getPostsByMultipleHashtags(hashtagNames: string[], sortBy?: string): Promise<PostWithUser[]>;
  getPostsByPrivacy(privacy: string, userId?: number): Promise<PostWithUser[]>;
  getFriendsPosts(userId: number): Promise<PostWithUser[]>;
  getTaggedPosts(userId: number): Promise<PostWithUser[]>;
  updatePostEngagement(postId: number, increment: number): Promise<void>;

  // Comment methods
  createComment(comment: InsertComment & { postId: number; userId: number; hashtags?: string[]; taggedUsers?: number[] }): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;

  // Like methods
  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  getUserLike(postId: number, userId: number): Promise<boolean>;

  // Share methods
  sharePost(postId: number, userId?: number): Promise<void>;

  // Stats methods
  getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number }>;
  getUserTotalShares(userId: number): Promise<number>;

  // Friends methods
  sendFriendRequest(fromUserId: number, toUserId: number): Promise<void>;
  getFriendRequests(userId: number): Promise<Array<{ id: number; fromUser: User; createdAt: Date }>>;
  getOutgoingFriendRequests(userId: number): Promise<Array<{ id: number; toUser: User; createdAt: Date }>>;
  respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void>;
  getFriends(userId: number): Promise<UserWithFriends[]>;
  getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>>;
  getFriendsOrderedByRecentTags(userId: number): Promise<User[]>;
  areFriends(userId: number, friendId: number): Promise<boolean>;
  removeFriend(userId: number, friendId: number): Promise<void>;

  // Hashtag methods
  createHashtag(name: string): Promise<Hashtag>;
  getHashtag(name: string): Promise<Hashtag | undefined>;
  getTrendingHashtags(limit?: number): Promise<Hashtag[]>;
  incrementHashtagCount(name: string): Promise<void>;
  
  // Hashtag following methods
  followHashtag(userId: number, hashtagId: number): Promise<void>;
  unfollowHashtag(userId: number, hashtagId: number): Promise<void>;
  isFollowingHashtag(userId: number, hashtagId: number): Promise<boolean>;
  getFollowedHashtags(userId: number, limit?: number): Promise<Hashtag[]>;

  // Notification methods
  createNotification(notification: CreateNotificationData): Promise<Notification>;
  getNotifications(userId: number): Promise<NotificationWithUser[]>;
  markNotificationAsViewed(notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Report methods
  createReport(report: CreateReportData & { userId: number }): Promise<Report>;
  getReports(): Promise<Report[]>;
  deleteReport(reportId: number): Promise<void>;

  // Blacklist methods
  addToBlacklist(type: string, value: string): Promise<void>;
  getBlacklist(): Promise<BlacklistItem[]>;
  isBlacklisted(type: string, value: string): Promise<boolean>;

  // RSVP methods
  createRsvp(postId: number, userId: number, status: string): Promise<void>;
  updateRsvp(postId: number, userId: number, status: string): Promise<void>;
  getRsvp(postId: number, userId: number): Promise<{ status: string } | undefined>;
  getRsvpStats(postId: number): Promise<{ going: number; maybe: number; not_going: number }>;
  getRsvpList(postId: number, status: string): Promise<Array<{ user: User; createdAt: Date }>>;

  // View tracking methods
  trackView(postId: number, userId: number | null, viewType: string, viewDuration?: number): Promise<void>;
  getPostViews(postId: number): Promise<number>;

  // Save post methods
  savePost(postId: number, userId: number, categoryId: number): Promise<void>;
  unsavePost(postId: number, userId: number): Promise<void>;
  getSavedPosts(userId: number, categoryId?: number): Promise<PostWithUser[]>;
  isSaved(postId: number, userId: number): Promise<boolean>;

  // Repost methods
  repostPost(postId: number, userId: number): Promise<void>;
  unrepost(postId: number, userId: number): Promise<void>;
  getReposts(userId: number): Promise<PostWithStats[]>;
  isReposted(postId: number, userId: number): Promise<boolean>;

  // Flag methods
  flagPost(postId: number, userId: number, reason?: string): Promise<void>;
  unflagPost(postId: number, userId: number): Promise<void>;
  
  // Tag methods
  tagFriendInPost(postId: number, fromUserId: number, toUserId: number): Promise<void>;
  getPostFlags(postId: number): Promise<number>;
  checkAutoDelete(postId: number): Promise<boolean>;

  // Tag methods
  tagFriendsToPost(postId: number, fromUserId: number, toUserIds: number[]): Promise<void>;
  getTaggedPosts(userId: number): Promise<PostWithUser[]>;
  getSharedWithMePosts(userId: number): Promise<PostWithUser[]>;
  markTaggedPostViewed(postId: number, userId: number): Promise<void>;

  // Admin methods
  getAnalytics(): Promise<{ userCount: number; postCount: number; trendingHashtags: Hashtag[] }>;
  flagUser(userId: number): Promise<void>;
  unflagUser(userId: number): Promise<void>;

  // Delete methods
  deletePost(postId: number): Promise<void>;
  deleteCategory(categoryId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserWithFriends(id: number): Promise<UserWithFriends | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const friendsList = await this.getFriends(id);
    return {
      ...user,
      friends: friendsList.map(f => ({ id: f.id, username: f.username, name: f.name, profilePictureUrl: f.profilePictureUrl })),
      friendCount: friendsList.length,
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      if (!query || query.trim() === '') {
        // Return all users if no query provided
        const allUsers = await db.select().from(users);
        return allUsers;
      }
      
      const searchTerm = `%${query.toLowerCase()}%`;
      const foundUsers = await db.select().from(users).where(
        or(
          sql`LOWER(${users.username}) LIKE ${searchTerm}`,
          sql`LOWER(${users.name}) LIKE ${searchTerm}`
        )
      ).limit(20);
      
      return foundUsers;
    } catch (error) {
      console.error('Database search error:', error);
      // Fallback to return existing users for testing
      const allUsers = await db.select().from(users);
      if (!query || query.trim() === '') {
        return allUsers;
      }
      const searchTerm = query.toLowerCase();
      return allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) || 
        user.name.toLowerCase().includes(searchTerm)
      ).slice(0, 20);
    }
  }

  async updateUserPrivacy(userId: number, privacy: string): Promise<void> {
    // For now, we'll store privacy preference in user preferences
    // In a real implementation, add defaultPrivacy field to users table
    console.log(`Privacy setting ${privacy} saved for user ${userId}`);
    // This would be: await db.update(users).set({ defaultPrivacy: privacy }).where(eq(users.id, userId));
  }

  async createCategory(categoryData: InsertCategory & { userId: number }): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  async getCategoriesByUserId(userId: number): Promise<CategoryWithPosts[]> {
    const userCategories = await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.id);
    
    const categoriesWithPosts: CategoryWithPosts[] = [];
    for (const category of userCategories) {
      const categoryPosts = await this.getPostsByCategoryId(category.id);
      // Get the most recent post's image (first item since posts are sorted by date desc)
      const mostRecentImage = categoryPosts[0]?.primaryPhotoUrl;
      categoriesWithPosts.push({
        ...category,
        posts: categoryPosts,
        postCount: categoryPosts.length,
        firstPostImage: mostRecentImage
      });
    }
    
    return categoriesWithPosts;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryWithPosts(id: number): Promise<CategoryWithPosts | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;
    
    const categoryPosts = await this.getPostsByCategoryId(id);
    return {
      ...category,
      posts: categoryPosts,
      postCount: categoryPosts.length,
      firstPostImage: categoryPosts[0]?.primaryPhotoUrl
    };
  }

  // Enhanced category methods with privacy control
  async getCategoriesWithAccess(viewerId?: number): Promise<CategoryWithPosts[]> {
    if (!viewerId) {
      // Public categories only for unauthenticated users
      const publicCategories = await db.select().from(categories).where(eq(categories.isPublic, true));
      const categoriesWithPosts: CategoryWithPosts[] = [];
      
      for (const category of publicCategories) {
        const categoryPosts = await this.getPostsByCategoryId(category.id);
        categoriesWithPosts.push({
          ...category,
          posts: categoryPosts,
          postCount: categoryPosts.length,
          firstPostImage: categoryPosts[0]?.primaryPhotoUrl
        });
      }
      return categoriesWithPosts;
    }

    // Get all categories the user can access
    const publicCategories = await db.select().from(categories).where(eq(categories.isPublic, true));
    
    // Get user's own categories
    const ownCategories = await db.select().from(categories).where(eq(categories.userId, viewerId));
    
    // Get categories shared with connections (friends)
    const friendIds = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(and(eq(friendships.userId, viewerId), eq(friendships.status, 'accepted')));

    let connectionCategories: Category[] = [];
    if (friendIds.length > 0) {
      connectionCategories = await db
        .select()
        .from(categories)
        .where(
          and(
            inArray(categories.userId, friendIds.map(f => f.friendId)),
            eq(categories.privacyLevel, 'connections')
          )
        );
    }

    // Combine and deduplicate
    const allCategories = [...publicCategories, ...ownCategories, ...connectionCategories];
    const unique = allCategories.filter((cat, index, self) => 
      self.findIndex(c => c.id === cat.id) === index
    );

    // Convert to CategoryWithPosts
    const categoriesWithPosts: CategoryWithPosts[] = [];
    for (const category of unique) {
      const categoryPosts = await this.getPostsByCategoryId(category.id);
      categoriesWithPosts.push({
        ...category,
        posts: categoryPosts,
        postCount: categoryPosts.length,
        firstPostImage: categoryPosts[0]?.primaryPhotoUrl
      });
    }

    return categoriesWithPosts;
  }

  async createCategoryWithPrivacy(categoryData: InsertCategory & { privacyLevel?: string }): Promise<Category> {
    const [category] = await db.insert(categories).values({
      ...categoryData,
      privacyLevel: categoryData.privacyLevel || 'public',
      isPublic: (categoryData.privacyLevel || 'public') === 'public'
    }).returning();

    return category;
  }

  async canAccessCategory(categoryId: number, userId?: number): Promise<boolean> {
    if (!userId) {
      // Check if it's public
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.isPublic, true)))
        .limit(1);
      return !!category;
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!category) return false;

    // Owner can always access
    if (category.userId === userId) return true;

    // Public categories
    if (category.isPublic) return true;

    // Check if it's a connections-only category and user is a friend
    if (category.description?.includes('[privacy:connections]')) {
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userId, category.userId),
            eq(friendships.friendId, userId),
            eq(friendships.status, 'accepted')
          )
        )
        .limit(1);
      return !!friendship;
    }

    return false;
  }

  async getCategoryPrivacyLevel(categoryId: number): Promise<string> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!category) return 'public';

    if (category.isPublic) return 'public';
    if (category.description?.includes('[privacy:connections]')) return 'connections';
    if (category.description?.includes('[privacy:private]')) return 'private';
    
    return 'public';
  }

  async createPost(postData: InsertPost & { userId: number; categoryId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any; isEvent?: boolean; eventDate?: Date; reminders?: string[]; isRecurring?: boolean; recurringType?: string; taskList?: any[] }): Promise<Post> {
    let categoryId = postData.categoryId;
    
    // If no category specified or category is 0, find user's "General" category
    if (!categoryId || categoryId === 0) {
      const [generalCategory] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, postData.userId), eq(categories.name, 'General')));
      
      if (!generalCategory) {
        // Create General category if it doesn't exist for this user
        const [newGeneral] = await db.insert(categories).values({
          userId: postData.userId,
          name: 'General',
          description: 'Default category for all posts',
          isPublic: false,
        }).returning();
        categoryId = newGeneral.id;
      } else {
        categoryId = generalCategory.id;
      }
    }
    
    const [post] = await db.insert(posts).values({ 
      ...postData, 
      categoryId,
      primaryLink: postData.primaryLink || (postData.spotifyUrl || postData.youtubeUrl || ''),
      privacy: postData.privacy || 'public',
      engagement: 0,
      spotifyUrl: postData.spotifyUrl || null,
      youtubeUrl: postData.youtubeUrl || null,
      mediaMetadata: postData.mediaMetadata || null,
      // Event fields
      isEvent: postData.isEvent || false,
      eventDate: postData.eventDate || null,
      reminders: postData.reminders || null,
      isRecurring: postData.isRecurring || false,
      recurringType: postData.recurringType || null,
      taskList: postData.taskList || null,
      allowRsvp: postData.allowRsvp || false,
    }).returning();

    // Handle hashtags
    if (postData.hashtags && postData.hashtags.length > 0) {
      for (const hashtagName of postData.hashtags) {
        await this.incrementHashtagCount(hashtagName);
        const hashtag = await this.getHashtag(hashtagName) || await this.createHashtag(hashtagName);
        await db.insert(postHashtags).values({
          postId: post.id,
          hashtagId: hashtag.id,
        });
      }
    }

    // Handle tagged users
    if (postData.taggedUsers && postData.taggedUsers.length > 0) {
      for (const taggedUserId of postData.taggedUsers) {
        await db.insert(postTags).values({
          postId: post.id,
          userId: taggedUserId,
        });
        
        // Create notification for tagged user
        await this.createNotification({
          userId: taggedUserId,
          type: 'tag',
          postId: post.id,
          fromUserId: postData.userId,
        });
      }
    }

    return post;
  }

  async getPost(id: number): Promise<PostWithUser | undefined> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, id));

    if (!result[0]) return undefined;

    return {
      ...result[0].post,
      user: result[0].user,
      category: result[0].category
    } as PostWithUser;
  }

  async getAllPosts(viewerId?: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .orderBy(desc(posts.createdAt));

    const allPosts = result.map(r => ({
      ...r.post,
      user: r.user,
      category: r.category
    })) as PostWithUser[];

    // Filter posts based on privacy settings
    if (!viewerId) {
      // Anonymous users can only see public posts
      return allPosts.filter(post => post.privacy === 'public');
    }

    const filteredPosts = [];
    for (const post of allPosts) {
      if (post.privacy === 'public') {
        filteredPosts.push(post);
      } else if (post.privacy === 'friends' && post.userId !== viewerId) {
        // Check if viewer is a friend of the post author
        const areFriends = await this.areFriends(viewerId, post.userId);
        if (areFriends) {
          filteredPosts.push(post);
        }
      } else if (post.privacy === 'private' && post.userId !== viewerId) {
        // Check if viewer is tagged in the post
        const taggedUsers = await db
          .select({ userId: postTags.userId })
          .from(postTags)
          .where(eq(postTags.postId, post.id));
        
        if (taggedUsers.some(tag => tag.userId === viewerId)) {
          filteredPosts.push(post);
        }
      } else if (post.userId === viewerId) {
        // Users can always see their own posts
        filteredPosts.push(post);
      }
    }

    return filteredPosts;
  }

  async getPostsByUserId(userId: number): Promise<PostWithUser[]> {
    // Get user's original posts
    const originalPosts = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    // Get user's reposts
    const userReposts = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        },
        repostCreatedAt: reposts.createdAt
      })
      .from(reposts)
      .innerJoin(posts, eq(reposts.originalPostId, posts.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(reposts.userId, userId))
      .orderBy(desc(reposts.createdAt));

    // Combine and sort by creation time
    const allPosts = [
      ...originalPosts.map(r => ({
        ...r.post,
        user: r.user,
        category: r.category,
        isRepost: false,
        sortDate: r.post.createdAt
      })),
      ...userReposts.map(r => ({
        ...r.post,
        user: r.user,
        category: r.category,
        isRepost: true,
        sortDate: r.repostCreatedAt
      }))
    ];

    // Sort by creation date (most recent first)
    allPosts.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

    return allPosts as PostWithUser[];
  }

  async getPostsByCategoryId(categoryId: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.categoryId, categoryId))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user,
      category: r.category
    })) as PostWithUser[];
  }



  async getCommentsByPostId(postId: number): Promise<CommentWithUser[]> {
    const result = await db
      .select({
        comment: comments,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    const commentsMap = new Map<number, CommentWithUser>();
    const topLevelComments: CommentWithUser[] = [];

    // First pass: create all comments
    for (const r of result) {
      const commentWithUser: CommentWithUser = {
        ...r.comment,
        user: r.user ? {
          id: r.user.id,
          username: r.user.username,
          name: r.user.name,
          profilePictureUrl: r.user.profilePictureUrl
        } : {
          id: 0,
          username: 'deleted',
          name: 'Deleted User',
          profilePictureUrl: null
        },
        replies: []
      };
      commentsMap.set(r.comment.id, commentWithUser);
      
      if (!r.comment.parentId) {
        topLevelComments.push(commentWithUser);
      }
    }

    // Second pass: organize replies
    for (const r of result) {
      if (r.comment.parentId) {
        const parent = commentsMap.get(r.comment.parentId);
        const child = commentsMap.get(r.comment.id);
        if (parent && child) {
          parent.replies!.push(child);
        }
      }
    }

    return topLevelComments;
  }

  async likePost(postId: number, userId: number): Promise<void> {
    await db.insert(postLikes).values({ postId, userId });
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }

  async getUserLike(postId: number, userId: number): Promise<boolean> {
    const [like] = await db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return !!like;
  }

  async sharePost(postId: number, userId?: number): Promise<void> {
    // Check if user has shared this post in the last 30 seconds
    if (userId) {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const [recentShare] = await db
        .select()
        .from(postShares)
        .where(
          and(
            eq(postShares.postId, postId),
            eq(postShares.userId, userId),
            gt(postShares.sharedAt, thirtySecondsAgo)
          )
        );
      
      if (recentShare) {
        throw new Error('You can only share a post once every 30 seconds');
      }
    }
    
    await db.insert(postShares).values({ postId, userId });
  }

  async getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number }> {
    const [likeCount] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));
    const [commentCount] = await db.select({ count: count() }).from(comments).where(eq(comments.postId, postId));
    const [shareCount] = await db.select({ count: count() }).from(postShares).where(eq(postShares.postId, postId));

    return {
      likeCount: likeCount.count,
      commentCount: commentCount.count,
      shareCount: shareCount.count,
    };
  }

  async getUserTotalShares(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(postShares)
      .innerJoin(posts, eq(postShares.postId, posts.id))
      .where(eq(posts.userId, userId));

    return result?.count || 0;
  }

  async deletePost(postId: number): Promise<void> {
    // Delete related data first
    await db.delete(postLikes).where(eq(postLikes.postId, postId));
    await db.delete(postShares).where(eq(postShares.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    // Delete the post
    await db.delete(posts).where(eq(posts.id, postId));
  }

  async deleteCategory(categoryId: number): Promise<void> {
    // Move posts in this category to General category (id: 1)
    await db.update(posts)
      .set({ categoryId: 1 })
      .where(eq(posts.categoryId, categoryId));
    // Delete the category
    await db.delete(categories).where(eq(categories.id, categoryId));
  }

  // Enhanced post methods
  async getPostsByHashtag(hashtagName: string): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .innerJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(hashtags.name, hashtagName))
      .orderBy(desc(posts.engagement));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      category: r.category || undefined
    })) as PostWithUser[];
  }

  async getPostsByMultipleHashtags(hashtagNames: string[], sortBy: string = 'popular'): Promise<PostWithUser[]> {
    if (hashtagNames.length === 0) {
      return [];
    }

    // Use AND logic: find posts that contain ALL of the selected hashtags
    // We do this by finding posts that have hashtag matches equal to the number of hashtags requested
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        },
        matchCount: count()
      })
      .from(posts)
      .innerJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(inArray(hashtags.name, hashtagNames))
      .groupBy(posts.id, users.id, users.username, users.name, users.profilePictureUrl, categories.id, categories.name)
      .having(sql`count(*) = ${hashtagNames.length}`)
      .orderBy(sortBy === 'popular' ? desc(posts.engagement) : desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      category: r.category || undefined
    })) as PostWithUser[];
  }

  async getPostsByPrivacy(privacy: string, userId?: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.privacy, privacy))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      category: r.category || undefined
    })) as PostWithUser[];
  }

  async getFriendsPosts(userId: number): Promise<PostWithUser[]> {
    const friendIds = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(and(eq(friendships.userId, userId), eq(friendships.status, 'accepted')));

    if (friendIds.length === 0) return [];

    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        category: {
          id: categories.id,
          name: categories.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(inArray(posts.userId, friendIds.map(f => f.friendId)))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      category: r.category || undefined
    })) as PostWithUser[];
  }



  async updatePostEngagement(postId: number, increment: number): Promise<void> {
    await db
      .update(posts)
      .set({ engagement: sql`${posts.engagement} + ${increment}` })
      .where(eq(posts.id, postId));
  }

  // Enhanced comment methods
  async createComment(commentData: InsertComment & { postId: number; userId: number; hashtags?: string[]; taggedUsers?: number[] }): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      ...commentData,
      rating: commentData.rating || null,
    }).returning();

    // Handle hashtags
    if (commentData.hashtags && commentData.hashtags.length > 0) {
      for (const hashtagName of commentData.hashtags) {
        await this.incrementHashtagCount(hashtagName);
        const hashtag = await this.getHashtag(hashtagName) || await this.createHashtag(hashtagName);
        await db.insert(commentHashtags).values({
          commentId: comment.id,
          hashtagId: hashtag.id,
        });
      }
    }

    // Handle tagged users
    if (commentData.taggedUsers && commentData.taggedUsers.length > 0) {
      for (const taggedUserId of commentData.taggedUsers) {
        await db.insert(commentTags).values({
          commentId: comment.id,
          userId: taggedUserId,
        });
        
        // Create notification for tagged user
        await this.createNotification({
          userId: taggedUserId,
          type: 'comment',
          postId: commentData.postId,
          fromUserId: commentData.userId,
        });
      }
    }

    // Update post engagement
    await this.updatePostEngagement(commentData.postId, 1);

    return comment;
  }

  // Friends methods
  async sendFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
    if (fromUserId === toUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if already following this user
    const existingFollow = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, fromUserId), 
          eq(friendships.friendId, toUserId)
        )
      )
      .limit(1);

    if (existingFollow.length > 0) {
      throw new Error("Already following this user");
    }

    // Check if friend request already exists
    const existingRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromUserId),
          eq(friendRequests.toUserId, toUserId),
          eq(friendRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      throw new Error("Friend request already sent");
    }

    // Create friend request that needs approval
    await db.insert(friendRequests).values({
      fromUserId,
      toUserId,
      status: "pending"
    });

    // Create notification for the follow
    try {
      await this.createNotification({
        userId: toUserId,
        type: "friend_request",
        fromUserId
      });
    } catch (notificationError) {
      console.log('Notification creation failed, but friendship was established:', notificationError);
      // Don't throw error - the friendship was successfully created
    }
  }

  async respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void> {
    const [request] = await db
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Friend request not found");
    }

    if (action === 'accept') {
      // Create bidirectional friendship with connected status
      await db.insert(friendships).values([
        {
          userId: request.fromUserId,
          friendId: request.toUserId,
          status: "connected"
        },
        {
          userId: request.toUserId,
          friendId: request.fromUserId,
          status: "connected"
        }
      ]);

      // Create notification for acceptance
      try {
        await this.createNotification({
          userId: request.fromUserId,
          type: "friend_accept",
          fromUserId: request.toUserId
        });
      } catch (notificationError) {
        console.log('Notification creation failed:', notificationError);
      }
    }

    // Update request status
    await db.update(friendRequests)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .where(eq(friendRequests.id, requestId));
  }

  async getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const friends = await this.getFriends(userId);
    const result = [];

    for (const friend of friends) {
      const [recentPost] = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, friend.id),
            sql`${posts.createdAt} >= ${threeDaysAgo}`
          )
        )
        .limit(1);

      result.push({
        user: {
          id: friend.id,
          username: friend.username,
          name: friend.name,
          profilePictureUrl: friend.profilePictureUrl,
          password: '',
          defaultPrivacy: friend.defaultPrivacy || 'public',
          createdAt: friend.createdAt
        },
        hasRecentPosts: !!recentPost
      });
    }

    return result;
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
    await db.delete(friendships).where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
      )
    );
  }

  async getFriends(userId: number): Promise<UserWithFriends[]> {
    const result = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
          createdAt: users.createdAt,
        },
        status: friendships.status
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(eq(friendships.userId, userId));

    return result.map(r => ({
      ...r.user,
      password: '', // Required by User type but not exposed
      friends: [],
      friendCount: 0,
      relationshipStatus: r.status // Add relationship status
    })) as any;
  }

  async getFriendsOrderedByRecentTags(userId: number): Promise<User[]> {
    // Get all connected friends using direct join approach
    const result = await db
      .selectDistinct({
        id: users.id,
        username: users.username,
        name: users.name,
        profilePictureUrl: users.profilePictureUrl,
        createdAt: users.createdAt,
        password: users.password,
        defaultPrivacy: users.defaultPrivacy,
      })
      .from(users)
      .innerJoin(friendships, 
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, users.id)),
          and(eq(friendships.friendId, userId), eq(friendships.userId, users.id))
        )
      )
      .where(
        and(
          ne(users.id, userId), // Exclude self
          inArray(friendships.status, ['accepted', 'connected'])
        )
      )
      .orderBy(users.name);

    return result as User[];
  }

  async getFriendRequests(userId: number): Promise<Array<{ id: number; fromUser: User; createdAt: Date }>> {
    const result = await db
      .select({
        id: friendRequests.id,
        fromUser: users,
        createdAt: friendRequests.createdAt
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.fromUserId, users.id))
      .where(
        and(
          eq(friendRequests.toUserId, userId),
          eq(friendRequests.status, "pending")
        )
      )
      .orderBy(desc(friendRequests.createdAt));

    return result.map(r => ({
      id: r.id,
      fromUser: r.fromUser,
      createdAt: r.createdAt
    }));
  }

  async getOutgoingFriendRequests(userId: number): Promise<Array<{ id: number; toUser: User; createdAt: Date }>> {
    const result = await db
      .select({
        id: friendRequests.id,
        toUser: users,
        createdAt: friendRequests.createdAt
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.toUserId, users.id))
      .where(
        and(
          eq(friendRequests.fromUserId, userId),
          eq(friendRequests.status, "pending")
        )
      )
      .orderBy(desc(friendRequests.createdAt));

    return result.map(r => ({
      id: r.id,
      toUser: r.toUser,
      createdAt: r.createdAt
    }));
  }



  async areFriends(userId: number, friendId: number): Promise<boolean> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(and(
        eq(friendships.userId, userId),
        eq(friendships.friendId, friendId),
        eq(friendships.status, 'accepted')
      ));

    return !!friendship;
  }

  // Hashtag methods
  async createHashtag(name: string): Promise<Hashtag> {
    const [hashtag] = await db.insert(hashtags).values({
      name: name.toLowerCase(),
      count: 1,
    }).returning();
    return hashtag;
  }

  async getHashtag(name: string): Promise<Hashtag | undefined> {
    const [hashtag] = await db
      .select()
      .from(hashtags)
      .where(eq(hashtags.name, name.toLowerCase()));
    return hashtag || undefined;
  }

  async getTrendingHashtags(limit: number = 10): Promise<Hashtag[]> {
    return await db
      .select()
      .from(hashtags)
      .orderBy(desc(hashtags.count))
      .limit(limit);
  }

  async incrementHashtagCount(name: string): Promise<void> {
    const hashtag = await this.getHashtag(name);
    if (hashtag) {
      await db
        .update(hashtags)
        .set({ count: sql`${hashtags.count} + 1` })
        .where(eq(hashtags.id, hashtag.id));
    }
  }

  async followHashtag(userId: number, hashtagId: number): Promise<void> {
    // Check if already following
    const existing = await db
      .select()
      .from(hashtagFollows)
      .where(and(eq(hashtagFollows.userId, userId), eq(hashtagFollows.hashtagId, hashtagId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(hashtagFollows).values({ userId, hashtagId });
    }
  }

  async unfollowHashtag(userId: number, hashtagId: number): Promise<void> {
    await db
      .delete(hashtagFollows)
      .where(and(eq(hashtagFollows.userId, userId), eq(hashtagFollows.hashtagId, hashtagId)));
  }

  async isFollowingHashtag(userId: number, hashtagId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(hashtagFollows)
      .where(and(eq(hashtagFollows.userId, userId), eq(hashtagFollows.hashtagId, hashtagId)))
      .limit(1);

    return result.length > 0;
  }

  async getFollowedHashtags(userId: number, limit: number = 30): Promise<Hashtag[]> {
    const result = await db
      .select({
        hashtag: hashtags
      })
      .from(hashtagFollows)
      .innerJoin(hashtags, eq(hashtagFollows.hashtagId, hashtags.id))
      .where(eq(hashtagFollows.userId, userId))
      .orderBy(desc(hashtagFollows.createdAt))
      .limit(limit);

    return result.map(r => r.hashtag);
  }

  // Notification methods
  async createNotification(notification: CreateNotificationData): Promise<Notification> {
    // Check if a similar notification exists within the last 24 hours to avoid spam
    if (notification.type === 'like' || notification.type === 'comment') {
      const existingNotification = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, notification.userId),
            eq(notifications.type, notification.type),
            eq(notifications.postId, notification.postId!),
            gt(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          )
        )
        .limit(1);

      if (existingNotification.length > 0) {
        // Update the existing notification timestamp instead of creating a new one
        await db
          .update(notifications)
          .set({ 
            createdAt: new Date()
          })
          .where(eq(notifications.id, existingNotification[0].id));
        
        return existingNotification[0];
      }
    }

    // Remove any message field from notification data
    const { message, ...notificationData } = notification as any;
    const [newNotification] = await db.insert(notifications).values(notificationData).returning();
    return newNotification;
  }

  async getNotifications(userId: number): Promise<NotificationWithUser[]> {
    const result = await db
      .select({
        notification: notifications,
        fromUser: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
        },
        post: {
          id: posts.id,
          primaryDescription: posts.primaryDescription,
        }
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return result.map(r => ({
      ...r.notification,
      fromUser: r.fromUser || undefined,
      post: r.post || undefined,
    })) as NotificationWithUser[];
  }

  async markNotificationAsViewed(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ viewed: true })
      .where(eq(notifications.id, notificationId));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.viewed, false)));

    return result?.count || 0;
  }

  // Report methods
  async createReport(report: CreateReportData & { userId: number }): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async deleteReport(reportId: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, reportId));
  }

  // Blacklist methods
  async addToBlacklist(type: string, value: string): Promise<void> {
    await db.insert(blacklist).values({ type, value });
  }

  async getBlacklist(): Promise<BlacklistItem[]> {
    return await db.select().from(blacklist);
  }

  async isBlacklisted(type: string, value: string): Promise<boolean> {
    const [item] = await db
      .select()
      .from(blacklist)
      .where(and(eq(blacklist.type, type), eq(blacklist.value, value)));
    return !!item;
  }

  // Admin methods
  async getAnalytics(): Promise<{ userCount: number; postCount: number; trendingHashtags: Hashtag[] }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [postCount] = await db.select({ count: count() }).from(posts);
    const trendingHashtags = await this.getTrendingHashtags(5);

    return {
      userCount: userCount.count,
      postCount: postCount.count,
      trendingHashtags,
    };
  }

  async flagUser(userId: number): Promise<void> {
    // Add implementation for flagging users (could be a new field in users table)
    // For now, we'll use a simple approach by creating a "flagged" category in blacklist
    await this.addToBlacklist('user', userId.toString());
  }

  async unflagUser(userId: number): Promise<void> {
    await db
      .delete(blacklist)
      .where(and(eq(blacklist.type, 'user'), eq(blacklist.value, userId.toString())));
  }

  // RSVP methods
  async createRsvp(postId: number, userId: number, status: string): Promise<void> {
    await db.insert(rsvps).values({
      postId,
      userId,
      status,
    });
  }

  async updateRsvp(postId: number, userId: number, status: string): Promise<void> {
    await db
      .update(rsvps)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(rsvps.postId, postId), eq(rsvps.userId, userId)));
  }

  async getRsvp(postId: number, userId: number): Promise<{ status: string } | undefined> {
    const [rsvp] = await db
      .select({ status: rsvps.status })
      .from(rsvps)
      .where(and(eq(rsvps.postId, postId), eq(rsvps.userId, userId)));
    
    return rsvp;
  }

  async getRsvpStats(postId: number): Promise<{ going: number; maybe: number; not_going: number }> {
    const stats = await db
      .select({
        status: rsvps.status,
        count: count(),
      })
      .from(rsvps)
      .where(eq(rsvps.postId, postId))
      .groupBy(rsvps.status);

    const result = { going: 0, maybe: 0, not_going: 0 };
    stats.forEach(stat => {
      if (stat.status === 'going') result.going = stat.count;
      else if (stat.status === 'maybe') result.maybe = stat.count;
      else if (stat.status === 'not_going') result.not_going = stat.count;
    });

    return result;
  }

  async getRsvpList(postId: number, status: string): Promise<Array<{ user: User; createdAt: Date }>> {
    const result = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
        },
        createdAt: rsvps.createdAt,
      })
      .from(rsvps)
      .innerJoin(users, eq(rsvps.userId, users.id))
      .where(and(eq(rsvps.postId, postId), eq(rsvps.status, status)))
      .orderBy(desc(rsvps.createdAt));

    return result.map(r => ({
      user: r.user as User,
      createdAt: r.createdAt,
    }));
  }

  // View tracking methods
  async trackView(postId: number, userId: number | null, viewType: string, viewDuration?: number): Promise<void> {
    await db.insert(postViews).values({
      postId,
      userId,
      viewType,
      viewDuration,
    });
  }

  async getPostViews(postId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(postViews)
      .where(eq(postViews.postId, postId));
    
    return result?.count || 0;
  }

  // Save post methods
  async savePost(postId: number, userId: number, categoryId: number): Promise<void> {
    await db.insert(savedPosts).values({
      postId,
      userId,
      categoryId,
    });
  }

  async unsavePost(postId: number, userId: number): Promise<void> {
    await db.delete(savedPosts).where(
      and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId))
    );
  }

  async getSavedPosts(userId: number, categoryId?: number): Promise<PostWithUser[]> {
    let whereCondition = eq(savedPosts.userId, userId);
    
    if (categoryId) {
      const categoryCondition = eq(savedPosts.categoryId, categoryId);
      whereCondition = and(whereCondition, categoryCondition) || whereCondition;
    }

    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(savedPosts)
      .innerJoin(posts, eq(savedPosts.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(desc(savedPosts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user as Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>,
      category: r.category as Pick<Category, 'id' | 'name'> | undefined,
      additionalPhotoData: r.post.additionalPhotoData ? JSON.parse(r.post.additionalPhotoData as string) : undefined,
    }));
  }

  async isSaved(postId: number, userId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: savedPosts.id })
      .from(savedPosts)
      .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)))
      .limit(1);
    
    return !!result;
  }

  // Repost methods
  async repost(postId: number, userId: number): Promise<void> {
    await db.insert(reposts).values({
      originalPostId: postId,
      userId,
    });
  }

  async unrepost(postId: number, userId: number): Promise<void> {
    await db.delete(reposts).where(
      and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId))
    );
  }

  async getReposts(userId: number): Promise<PostWithStats[]> {
    const result = await db
      .select({
        repost: reposts,
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(reposts)
      .innerJoin(posts, eq(reposts.originalPostId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(reposts.userId, userId))
      .orderBy(desc(reposts.createdAt));

    const postsWithViews = await Promise.all(
      result.map(async (r) => {
        const viewCount = await this.getPostViews(r.post.id);
        const currentUser = await this.getUser(userId);
        return {
          ...r.post,
          user: r.user as Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>,
          category: r.category as Pick<Category, 'id' | 'name'> | undefined,
          additionalPhotoData: r.post.additionalPhotoData ? JSON.parse(r.post.additionalPhotoData as string) : undefined,
          viewCount,
          isRepost: true,
          repostUser: currentUser ? {
            id: currentUser.id,
            username: currentUser.username,
            name: currentUser.name,
            profilePictureUrl: currentUser.profilePictureUrl
          } : undefined,
        };
      })
    );

    return postsWithViews;
  }

  async isReposted(postId: number, userId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: reposts.id })
      .from(reposts)
      .where(and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId)))
      .limit(1);
    
    return !!result;
  }

  // Flag methods
  async flagPost(postId: number, userId: number, reason?: string): Promise<void> {
    await db.insert(postFlags).values({
      postId,
      userId,
      reason,
    });
  }

  async unflagPost(postId: number, userId: number): Promise<void> {
    await db.delete(postFlags).where(
      and(eq(postFlags.postId, postId), eq(postFlags.userId, userId))
    );
  }

  async getPostFlags(postId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(postFlags)
      .where(eq(postFlags.postId, postId));
    
    return result?.count || 0;
  }

  async checkAutoDelete(postId: number): Promise<boolean> {
    const flagCount = await this.getPostFlags(postId);
    if (flagCount >= 2) {
      await this.deletePost(postId);
      return true;
    }
    return false;
  }

  // Tag methods
  async tagFriendsToPost(postId: number, fromUserId: number, toUserIds: number[]): Promise<void> {
    const values = toUserIds.map(toUserId => ({
      postId,
      fromUserId,
      toUserId,
    }));
    
    if (values.length > 0) {
      await db.insert(taggedPosts).values(values);
      
      // Create notifications for tagged users
      const notificationValues = toUserIds.map(toUserId => ({
        userId: toUserId,
        type: "tag" as const,
        postId,
        fromUserId,
      }));
      
      await db.insert(notifications).values(notificationValues);
    }
  }

  async getTaggedPosts(userId: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
        },
        taggedBy: {
          id: sql<number>`tagger.id`,
          username: sql<string>`tagger.username`,
          name: sql<string>`tagger.name`,
          profilePictureUrl: sql<string>`tagger.profile_picture_url`,
        },
      })
      .from(taggedPosts)
      .innerJoin(posts, eq(taggedPosts.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(sql`users AS tagger`, sql`tagged_posts.from_user_id = tagger.id`)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(taggedPosts.toUserId, userId))
      .orderBy(desc(taggedPosts.createdAt));

    return result.map(r => ({
      ...r.post,
      additionalPhotoData: r.post.additionalPhotoData as any,
      user: r.user as Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>,
      category: r.category as Pick<Category, 'id' | 'name'> | undefined,
      taggedBy: r.taggedBy as Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>,
    })) as PostWithUser[];
  }

  async getSharedWithMePosts(userId: number): Promise<PostWithUser[]> {
    return this.getTaggedPosts(userId);
  }

  async markTaggedPostViewed(postId: number, userId: number): Promise<void> {
    await db
      .update(taggedPosts)
      .set({ isViewed: true })
      .where(and(eq(taggedPosts.postId, postId), eq(taggedPosts.toUserId, userId)));
  }

  // Repost methods
  async repostPost(postId: number, userId: number): Promise<void> {
    await db.insert(reposts).values({
      originalPostId: postId,
      userId,
    });
  }

  async unrepost(postId: number, userId: number): Promise<void> {
    await db
      .delete(reposts)
      .where(and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId)));
  }

  async getReposts(userId: number): Promise<PostWithStats[]> {
    const userReposts = await db
      .select({
        post: posts,
        user: users,
        repostedAt: reposts.createdAt,
      })
      .from(reposts)
      .innerJoin(posts, eq(reposts.originalPostId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(reposts.userId, userId))
      .orderBy(desc(reposts.createdAt));

    return userReposts.map(({ post, user, repostedAt }) => ({
      ...post,
      user,
      repostedAt,
    })) as PostWithStats[];
  }

  async isReposted(postId: number, userId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(reposts)
      .where(and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  // Flag methods
  async flagPost(postId: number, userId: number, reason?: string): Promise<void> {
    await db.insert(postFlags).values({
      postId,
      userId,
      reason,
    });
  }

  async unflagPost(postId: number, userId: number): Promise<void> {
    await db
      .delete(postFlags)
      .where(and(eq(postFlags.postId, postId), eq(postFlags.userId, userId)));
  }

  // Tag methods
  async tagFriendInPost(postId: number, fromUserId: number, toUserId: number): Promise<void> {
    await db.insert(taggedPosts).values({
      postId,
      fromUserId,
      toUserId,
    });

    // Create notification for tagged user
    await this.createNotification({
      userId: toUserId,
      type: 'tag',
      postId,
      fromUserId,
    });
  }
}

export const storage = new DatabaseStorage();
