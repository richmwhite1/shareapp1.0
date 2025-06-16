import { 
  users, posts, comments, categories, postLikes, postShares, friendships, hashtags, 
  postHashtags, postTags, commentTags, commentHashtags, notifications, reports, blacklist,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, 
  type PostWithUser, type CommentWithUser, type Category, type InsertCategory, type CategoryWithPosts,
  type Friendship, type CreateFriendshipData, type Hashtag, type CreateHashtagData,
  type Notification, type CreateNotificationData, type Report, type CreateReportData,
  type BlacklistItem, type UserWithFriends, type NotificationWithUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, or, inArray, sql, like } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithFriends(id: number): Promise<UserWithFriends | undefined>;
  searchUsers(query: string): Promise<User[]>;

  // Category methods
  createCategory(category: InsertCategory & { userId: number }): Promise<Category>;
  getCategoriesByUserId(userId: number): Promise<CategoryWithPosts[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryWithPosts(id: number): Promise<CategoryWithPosts | undefined>;

  // Post methods
  createPost(post: InsertPost & { userId: number; categoryId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByCategoryId(categoryId: number): Promise<PostWithUser[]>;
  getPostsByHashtag(hashtagName: string): Promise<PostWithUser[]>;
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
  sendFriendRequest(userId: number, friendId: number): Promise<void>;
  acceptFriendRequest(userId: number, friendId: number): Promise<void>;
  rejectFriendRequest(userId: number, friendId: number): Promise<void>;
  getFriends(userId: number): Promise<UserWithFriends[]>;
  getFriendRequests(userId: number): Promise<User[]>;
  areFriends(userId: number, friendId: number): Promise<boolean>;

  // Hashtag methods
  createHashtag(name: string): Promise<Hashtag>;
  getHashtag(name: string): Promise<Hashtag | undefined>;
  getTrendingHashtags(limit?: number): Promise<Hashtag[]>;
  incrementHashtagCount(name: string): Promise<void>;

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
    const searchResults = await db
      .select()
      .from(users)
      .where(or(
        like(users.username, `%${query}%`),
        like(users.name, `%${query}%`)
      ))
      .limit(20);
    return searchResults;
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

  async createPost(postData: InsertPost & { userId: number; categoryId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any }): Promise<Post> {
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
      privacy: postData.privacy || 'public',
      engagement: 0,
      spotifyUrl: postData.spotifyUrl || null,
      youtubeUrl: postData.youtubeUrl || null,
      mediaMetadata: postData.mediaMetadata || null,
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

  async getAllPosts(): Promise<PostWithUser[]> {
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

    return result.map(r => ({
      ...r.post,
      user: r.user,
      category: r.category
    })) as PostWithUser[];
  }

  async getPostsByUserId(userId: number): Promise<PostWithUser[]> {
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
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user,
      category: r.category
    })) as PostWithUser[];
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

  async getTaggedPosts(userId: number): Promise<PostWithUser[]> {
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
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(postTags.userId, userId))
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
  async sendFriendRequest(userId: number, friendId: number): Promise<void> {
    await db.insert(friendships).values({
      userId,
      friendId,
      status: 'pending',
    });

    // Create notification
    await this.createNotification({
      userId: friendId,
      type: 'friend_request',
      fromUserId: userId,
    });
  }

  async acceptFriendRequest(userId: number, friendId: number): Promise<void> {
    // Update the friendship status
    await db
      .update(friendships)
      .set({ status: 'accepted' })
      .where(and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)));

    // Create reciprocal friendship
    await db.insert(friendships).values({
      userId,
      friendId,
      status: 'accepted',
    });
  }

  async rejectFriendRequest(userId: number, friendId: number): Promise<void> {
    await db
      .delete(friendships)
      .where(and(eq(friendships.userId, friendId), eq(friendships.friendId, userId)));
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
        }
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(and(eq(friendships.userId, userId), eq(friendships.status, 'accepted')));

    return result.map(r => ({
      ...r.user,
      password: '', // Required by User type but not exposed
      friends: [],
      friendCount: 0,
    })) as UserWithFriends[];
  }

  async getFriendRequests(userId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(and(eq(friendships.friendId, userId), eq(friendships.status, 'pending')));

    return result.map(r => r.user);
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

  // Notification methods
  async createNotification(notification: CreateNotificationData): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
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
}

export const storage = new DatabaseStorage();
