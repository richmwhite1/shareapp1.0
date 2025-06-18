import { 
  users, posts, comments, lists, postLikes, postShares, friendships, friendRequests, hashtags, 
  postHashtags, postTags, commentTags, commentHashtags, notifications, reports, blacklist, hashtagFollows, rsvps,
  postViews, savedPosts, reposts, postFlags, taggedPosts, listAccess, accessRequests,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, 
  type PostWithUser, type CommentWithUser, type List, type InsertList, type ListWithPosts,
  type Friendship, type CreateFriendshipData, type FriendRequest, type Hashtag, type CreateHashtagData,
  type Notification, type CreateNotificationData, type Report, type CreateReportData,
  type BlacklistItem, type UserWithFriends, type NotificationWithUser, type HashtagFollow, type Rsvp,
  type PostView, type SavedPost, type Repost, type PostFlag, type TaggedPost, type PostWithStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray, count, ne, like, ilike, isNull } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithFriends(id: number): Promise<UserWithFriends | undefined>;
  searchUsers(query: string): Promise<User[]>;
  updateUserPrivacy(userId: number, privacy: string): Promise<void>;

  // List methods
  createList(list: InsertList & { userId: number }): Promise<List>;
  getListsByUserId(userId: number): Promise<ListWithPosts[]>;
  getList(id: number): Promise<List | undefined>;
  getListWithPosts(id: number): Promise<ListWithPosts | undefined>;
  getListsWithAccess(viewerId?: number): Promise<ListWithPosts[]>;
  updateListPrivacy(listId: number, privacyLevel: string): Promise<void>;
  deleteList(listId: number): Promise<void>;
  
  // List access control methods
  inviteToList(listId: number, userId: number, role: string, invitedBy: number): Promise<void>;
  respondToListInvite(accessId: number, action: string): Promise<void>;
  getListAccess(listId: number): Promise<Array<{ userId: number; role: string; status: string; user: any }>>;
  getUserListAccess(userId: number): Promise<Array<{ listId: number; role: string; status: string; list: any }>>;
  hasListAccess(userId: number, listId: number): Promise<{ hasAccess: boolean; role?: string }>;
  removeListAccess(listId: number, userId: number): Promise<void>;
  
  // Access request methods
  createAccessRequest(listId: number, userId: number, requestedRole: string, message?: string): Promise<void>;
  getAccessRequests(listId: number): Promise<Array<{ id: number; userId: number; requestedRole: string; message?: string; user: any }>>;
  respondToAccessRequest(requestId: number, action: string): Promise<void>;

  // Post methods
  createPost(post: InsertPost & { userId: number; listId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any; isEvent?: boolean; eventDate?: Date; reminders?: string[]; isRecurring?: boolean; recurringType?: string; taskList?: any[]; allowRsvp?: boolean }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByListId(listId: number): Promise<PostWithUser[]>;
  getPostsByHashtag(hashtagName: string): Promise<PostWithUser[]>;
  getPostsByMultipleHashtags(hashtagNames: string[], sortBy?: string): Promise<PostWithUser[]>;
  getPostsByPrivacy(privacy: string, userId?: number): Promise<PostWithUser[]>;
  getFriendsPosts(userId: number): Promise<PostWithUser[]>;
  updatePost(postId: number, updates: Partial<Post>): Promise<void>;
  deletePost(postId: number): Promise<void>;
  updatePostEngagement(postId: number, increment: number): Promise<void>;

  // Comment methods
  createComment(comment: InsertComment & { postId: number; userId: number; hashtags?: string[]; taggedUsers?: number[] }): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;
  deleteComment(commentId: number): Promise<void>;

  // Like methods
  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  isPostLiked(postId: number, userId: number): Promise<boolean>;
  getPostLikeCount(postId: number): Promise<number>;

  // Share methods
  sharePost(postId: number, userId: number): Promise<void>;
  getPostShareCount(postId: number): Promise<number>;

  // Energy rating methods
  rateUserEnergy(ratedUserId: number, raterUserId: number, rating: number): Promise<void>;
  getUserEnergyStats(userId: number): Promise<{ average: number; count: number }>;

  // Friendship methods
  createFriendRequest(fromUserId: number, toUserId: number): Promise<void>;
  getFriendRequests(userId: number): Promise<FriendRequest[]>;
  respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void>;
  getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>>;
  removeFriend(userId: number, friendId: number): Promise<void>;
  getFriends(userId: number): Promise<UserWithFriends[]>;

  // Hashtag methods
  createHashtag(name: string): Promise<Hashtag>;
  getHashtagsByPostId(postId: number): Promise<Hashtag[]>;
  followHashtag(userId: number, hashtagId: number): Promise<void>;
  unfollowHashtag(userId: number, hashtagId: number): Promise<void>;
  getFollowedHashtags(userId: number): Promise<Hashtag[]>;
  getTrendingHashtags(limit?: number): Promise<Hashtag[]>;

  // Notification methods
  createNotification(notification: CreateNotificationData): Promise<Notification>;
  getNotifications(userId: number): Promise<NotificationWithUser[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Report methods
  createReport(report: CreateReportData): Promise<Report>;

  // Blacklist methods
  addToBlacklist(userId: number, blockedUserId: number): Promise<void>;
  removeFromBlacklist(userId: number, blockedUserId: number): Promise<void>;
  getBlacklist(userId: number): Promise<BlacklistItem[]>;

  // Post view tracking
  recordPostView(postId: number, userId?: number): Promise<void>;
  getPostViewCount(postId: number): Promise<number>;

  // Advanced methods
  getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }>;
  getPostsWithStats(userId?: number): Promise<PostWithStats[]>;
  savePost(postId: number, userId: number): Promise<void>;
  unsavePost(postId: number, userId: number): Promise<void>;
  getSavedPosts(userId: number): Promise<PostWithUser[]>;
  repost(postId: number, userId: number): Promise<void>;
  unrepost(postId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserWithFriends(id: number): Promise<UserWithFriends | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const friends = await this.getFriends(id);
    return {
      ...user,
      friends: friends.map(f => ({ id: f.id, username: f.username, name: f.name, profilePictureUrl: f.profilePictureUrl })),
      friendCount: friends.length
    };
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.name, `%${query}%`)
        )
      )
      .limit(20);
  }

  async updateUserPrivacy(userId: number, privacy: string): Promise<void> {
    await db
      .update(users)
      .set({ defaultPrivacy: privacy })
      .where(eq(users.id, userId));
  }

  // List methods
  async createList(listData: InsertList & { userId: number }): Promise<List> {
    const [list] = await db.insert(lists).values(listData).returning();
    return list;
  }

  async getListsByUserId(userId: number): Promise<ListWithPosts[]> {
    const userLists = await db.select().from(lists).where(eq(lists.userId, userId)).orderBy(lists.id);
    
    const listsWithPosts: ListWithPosts[] = [];
    for (const list of userLists) {
      const listPosts = await this.getPostsByListId(list.id);
      const mostRecentImage = listPosts[0]?.primaryPhotoUrl;
      listsWithPosts.push({
        ...list,
        posts: listPosts,
        postCount: listPosts.length,
        firstPostImage: mostRecentImage
      });
    }
    
    return listsWithPosts;
  }

  async getList(id: number): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list || undefined;
  }

  async getListWithPosts(id: number): Promise<ListWithPosts | undefined> {
    const list = await this.getList(id);
    if (!list) return undefined;
    
    const listPosts = await this.getPostsByListId(id);
    return {
      ...list,
      posts: listPosts,
      postCount: listPosts.length,
      firstPostImage: listPosts[0]?.primaryPhotoUrl
    };
  }

  // Enhanced list methods with privacy control
  async getListsWithAccess(viewerId?: number): Promise<ListWithPosts[]> {
    if (!viewerId) {
      const publicLists = await db.select().from(lists).where(eq(lists.isPublic, true));
      const listsWithPosts: ListWithPosts[] = [];
      
      for (const list of publicLists) {
        const listPosts = await this.getPostsByListId(list.id);
        listsWithPosts.push({
          ...list,
          posts: listPosts,
          postCount: listPosts.length,
          firstPostImage: listPosts[0]?.primaryPhotoUrl
        });
      }
      return listsWithPosts;
    }

    const publicLists = await db.select().from(lists).where(eq(lists.isPublic, true));
    const ownLists = await db.select().from(lists).where(eq(lists.userId, viewerId));
    
    const friendIds = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(and(eq(friendships.userId, viewerId), eq(friendships.status, 'accepted')));

    let connectionLists: List[] = [];
    if (friendIds.length > 0) {
      connectionLists = await db
        .select()
        .from(lists)
        .where(
          and(
            inArray(lists.userId, friendIds.map(f => f.friendId)),
            eq(lists.privacyLevel, 'connections')
          )
        );
    }

    const allLists = [...publicLists, ...ownLists, ...connectionLists];
    const unique = allLists.filter((list, index, self) => 
      self.findIndex(l => l.id === list.id) === index
    );

    const listsWithPosts: ListWithPosts[] = [];
    for (const list of unique) {
      const listPosts = await this.getPostsByListId(list.id);
      listsWithPosts.push({
        ...list,
        posts: listPosts,
        postCount: listPosts.length,
        firstPostImage: listPosts[0]?.primaryPhotoUrl
      });
    }

    return listsWithPosts;
  }

  async createListWithPrivacy(listData: InsertList & { privacyLevel?: string }): Promise<List> {
    const [list] = await db.insert(lists).values(listData).returning();
    return list;
  }

  async canAccessList(listId: number, userId?: number): Promise<boolean> {
    if (!userId) {
      const [list] = await db
        .select()
        .from(lists)
        .where(and(eq(lists.id, listId), eq(lists.isPublic, true)))
        .limit(1);
      return !!list;
    }

    const [list] = await db
      .select()
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);

    if (!list) return false;

    if (list.userId === userId) return true;
    if (list.isPublic) return true;

    if (list.privacyLevel === 'connections') {
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userId, list.userId),
            eq(friendships.friendId, userId),
            eq(friendships.status, 'accepted')
          )
        )
        .limit(1);
      return !!friendship;
    }

    return false;
  }

  async getListPrivacyLevel(listId: number): Promise<string> {
    const [list] = await db
      .select()
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);

    if (!list) return 'public';
    return list.privacyLevel || 'public';
  }

  // Post methods
  async createPost(postData: InsertPost & { userId: number; listId?: number; hashtags?: string[]; taggedUsers?: number[]; privacy?: string; spotifyUrl?: string; youtubeUrl?: string; mediaMetadata?: any; isEvent?: boolean; eventDate?: Date; reminders?: string[]; isRecurring?: boolean; recurringType?: string; taskList?: any[] }): Promise<Post> {
    let listId = postData.listId;
    
    if (!listId) {
      const defaultList = await db.select().from(lists).where(eq(lists.name, "General")).limit(1);
      if (defaultList.length > 0) {
        listId = defaultList[0].id;
      } else {
        const [newList] = await db.insert(lists).values({
          name: "General",
          userId: postData.userId,
          isPublic: true,
          privacyLevel: 'public'
        }).returning();
        listId = newList.id;
      }
    }

    const [post] = await db.insert(posts).values({
      ...postData,
      listId: listId!
    }).returning();

    if (postData.hashtags && postData.hashtags.length > 0) {
      for (const hashtagName of postData.hashtags) {
        let hashtag = await db.select().from(hashtags).where(eq(hashtags.name, hashtagName)).limit(1);
        if (hashtag.length === 0) {
          const [newHashtag] = await db.insert(hashtags).values({ name: hashtagName }).returning();
          hashtag = [newHashtag];
        }
        
        await db.insert(postHashtags).values({
          postId: post.id,
          hashtagId: hashtag[0].id
        });
      }
    }

    if (postData.taggedUsers && postData.taggedUsers.length > 0) {
      for (const userId of postData.taggedUsers) {
        await db.insert(postTags).values({
          postId: post.id,
          userId
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
        list: {
          id: lists.id,
          name: lists.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (result.length === 0) return undefined;
    
    const { post, user, list } = result[0];
    if (!user) return undefined;

    return {
      ...post,
      user,
      list: list || undefined
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
        list: {
          id: lists.id,
          name: lists.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
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
        list: {
          id: lists.id,
          name: lists.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  async getPostsByListId(listId: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        list: {
          id: lists.id,
          name: lists.name
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(posts.listId, listId))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  // Additional methods (comments, likes, shares, etc.)
  async createComment(commentData: InsertComment & { postId: number; userId: number; hashtags?: string[]; taggedUsers?: number[] }): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      ...commentData,
      rating: commentData.rating || null,
    }).returning();

    // Handle hashtags for comments
    if (commentData.hashtags && commentData.hashtags.length > 0) {
      for (const hashtagName of commentData.hashtags) {
        let hashtag = await db.select().from(hashtags).where(eq(hashtags.name, hashtagName)).limit(1);
        if (hashtag.length === 0) {
          const [newHashtag] = await db.insert(hashtags).values({ name: hashtagName }).returning();
          hashtag = [newHashtag];
        }
        
        await db.insert(commentHashtags).values({
          commentId: comment.id,
          hashtagId: hashtag[0].id
        });
      }
    }

    // Handle tagged users for comments
    if (commentData.taggedUsers && commentData.taggedUsers.length > 0) {
      for (const userId of commentData.taggedUsers) {
        await db.insert(commentTags).values({
          commentId: comment.id,
          userId
        });
      }
    }

    return comment;
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
      .orderBy(desc(comments.createdAt));

    return result.map(r => ({
      ...r.comment,
      user: r.user!,
      replies: []
    })) as CommentWithUser[];
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, commentId));
  }

  // Like methods
  async likePost(postId: number, userId: number): Promise<void> {
    await db.insert(postLikes).values({ postId, userId }).onConflictDoNothing();
    await this.updatePostEngagement(postId, 1);
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    await this.updatePostEngagement(postId, -1);
  }

  async isPostLiked(postId: number, userId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  async getPostLikeCount(postId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));
    return result[0]?.count || 0;
  }

  // Share methods
  async sharePost(postId: number, userId: number): Promise<void> {
    await db.insert(postShares).values({ postId, userId }).onConflictDoNothing();
    await this.updatePostEngagement(postId, 2);
  }

  async getPostShareCount(postId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(postShares)
      .where(eq(postShares.postId, postId));
    return result[0]?.count || 0;
  }

  async updatePostEngagement(postId: number, increment: number): Promise<void> {
    await db
      .update(posts)
      .set({ engagement: sql`${posts.engagement} + ${increment}` })
      .where(eq(posts.id, postId));
  }

  // Placeholder implementations for remaining methods
  async deletePost(postId: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, postId));
  }

  async updatePost(postId: number, updates: Partial<Post>): Promise<void> {
    await db.update(posts).set(updates).where(eq(posts.id, postId));
  }

  async getPostsByHashtag(hashtagName: string): Promise<PostWithUser[]> {
    return []; // Simplified implementation
  }

  async getPostsByMultipleHashtags(hashtagNames: string[], sortBy?: string): Promise<PostWithUser[]> {
    return []; // Simplified implementation
  }

  async getPostsByPrivacy(privacy: string, userId?: number): Promise<PostWithUser[]> {
    return []; // Simplified implementation
  }

  async getFriendsPosts(userId: number): Promise<PostWithUser[]> {
    return []; // Simplified implementation
  }

  async rateUserEnergy(ratedUserId: number, raterUserId: number, rating: number): Promise<void> {
    // Simplified implementation
  }

  async getUserEnergyStats(userId: number): Promise<{ average: number; count: number }> {
    return { average: 4, count: 0 }; // Simplified implementation
  }

  async createFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
    // Simplified implementation
  }

  async getFriendRequests(userId: number): Promise<FriendRequest[]> {
    return []; // Simplified implementation
  }

  async respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void> {
    // Simplified implementation
  }

  async getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>> {
    return []; // Simplified implementation
  }

  async removeFriend(userId: number, friendId: number): Promise<void> {
    // Simplified implementation
  }

  async getFriends(userId: number): Promise<UserWithFriends[]> {
    return []; // Simplified implementation
  }

  async createHashtag(name: string): Promise<Hashtag> {
    const [hashtag] = await db.insert(hashtags).values({ name }).returning();
    return hashtag;
  }

  async getHashtagsByPostId(postId: number): Promise<Hashtag[]> {
    return []; // Simplified implementation
  }

  async followHashtag(userId: number, hashtagId: number): Promise<void> {
    // Simplified implementation
  }

  async unfollowHashtag(userId: number, hashtagId: number): Promise<void> {
    // Simplified implementation
  }

  async getFollowedHashtags(userId: number): Promise<Hashtag[]> {
    return []; // Simplified implementation
  }

  async getTrendingHashtags(limit?: number): Promise<Hashtag[]> {
    return []; // Simplified implementation
  }

  async createNotification(notification: CreateNotificationData): Promise<Notification> {
    const [notif] = await db.insert(notifications).values({
      userId: notification.userId,
      type: notification.type,
      postId: notification.postId || null,
      fromUserId: notification.fromUserId || null,
      categoryId: notification.categoryId || null
    }).returning();
    return notif;
  }

  async getNotifications(userId: number): Promise<NotificationWithUser[]> {
    return []; // Simplified implementation
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    // Simplified implementation
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return 0; // Simplified implementation
  }

  async createReport(report: CreateReportData): Promise<Report> {
    const [rep] = await db.insert(reports).values({
      userId: report.userId,
      postId: report.postId,
      reason: report.reason,
      comment: report.comment
    }).returning();
    return rep;
  }

  async addToBlacklist(userId: number, blockedUserId: number): Promise<void> {
    // Simplified implementation
  }

  async removeFromBlacklist(userId: number, blockedUserId: number): Promise<void> {
    // Simplified implementation
  }

  async getBlacklist(userId: number): Promise<BlacklistItem[]> {
    return []; // Simplified implementation
  }

  async recordPostView(postId: number, userId?: number): Promise<void> {
    // Simplified implementation
  }

  async getPostViewCount(postId: number): Promise<number> {
    return 0; // Simplified implementation
  }

  async getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }> {
    return { likeCount: 0, commentCount: 0, shareCount: 0, viewCount: 0 }; // Simplified implementation
  }

  async getPostsWithStats(userId?: number): Promise<PostWithStats[]> {
    return []; // Simplified implementation
  }

  async savePost(postId: number, userId: number): Promise<void> {
    // Simplified implementation
  }

  async unsavePost(postId: number, userId: number): Promise<void> {
    // Simplified implementation
  }

  async getSavedPosts(userId: number): Promise<PostWithUser[]> {
    return []; // Simplified implementation
  }

  async repost(postId: number, userId: number): Promise<void> {
    // Simplified implementation
  }

  async unrepost(postId: number, userId: number): Promise<void> {
    // Simplified implementation
  }

  // List privacy and collaboration methods
  async updateListPrivacy(listId: number, privacyLevel: string): Promise<void> {
    await db
      .update(lists)
      .set({ 
        privacyLevel,
        isPublic: privacyLevel === 'public'
      })
      .where(eq(lists.id, listId));
  }

  async deleteList(listId: number): Promise<void> {
    // First, move all posts in this list to the General list
    const [generalList] = await db
      .select()
      .from(lists)
      .where(eq(lists.name, "General"))
      .limit(1);

    if (generalList) {
      await db
        .update(posts)
        .set({ listId: generalList.id })
        .where(eq(posts.listId, listId));
    }

    // Delete the list
    await db.delete(lists).where(eq(lists.id, listId));
  }

  async inviteToList(listId: number, userId: number, role: string, invitedBy: number): Promise<void> {
    // Check if invitation already exists
    const existing = await db
      .select()
      .from(listAccess)
      .where(
        and(
          eq(listAccess.listId, listId),
          eq(listAccess.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing invitation
      await db
        .update(listAccess)
        .set({ 
          role, 
          status: 'pending',
          invitedBy,
          updatedAt: new Date()
        })
        .where(eq(listAccess.id, existing[0].id));
    } else {
      // Create new invitation
      await db.insert(listAccess).values({
        listId,
        userId,
        role,
        status: 'pending',
        invitedBy
      });
    }

    // Create notification
    const list = await this.getList(listId);
    if (list) {
      await this.createNotification({
        userId,
        type: 'list_invitation',
        message: `You've been invited to collaborate on "${list.name}"`,
        metadata: { listId, role, invitedBy }
      });
    }
  }

  async respondToListInvite(accessId: number, action: string): Promise<void> {
    await db
      .update(listAccess)
      .set({ 
        status: action === 'accept' ? 'accepted' : 'rejected',
        updatedAt: new Date()
      })
      .where(eq(listAccess.id, accessId));
  }

  async getListAccess(listId: number): Promise<Array<{ userId: number; role: string; status: string; user: any }>> {
    const result = await db
      .select({
        userId: listAccess.userId,
        role: listAccess.role,
        status: listAccess.status,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(listAccess)
      .leftJoin(users, eq(listAccess.userId, users.id))
      .where(eq(listAccess.listId, listId));

    return result.map(r => ({
      userId: r.userId,
      role: r.role,
      status: r.status,
      user: r.user
    }));
  }

  async getUserListAccess(userId: number): Promise<Array<{ listId: number; role: string; status: string; list: any }>> {
    const result = await db
      .select({
        listId: listAccess.listId,
        role: listAccess.role,
        status: listAccess.status,
        list: {
          id: lists.id,
          name: lists.name,
          description: lists.description,
          privacyLevel: lists.privacyLevel,
          userId: lists.userId
        }
      })
      .from(listAccess)
      .leftJoin(lists, eq(listAccess.listId, lists.id))
      .where(eq(listAccess.userId, userId));

    return result.map(r => ({
      listId: r.listId,
      role: r.role,
      status: r.status,
      list: r.list
    }));
  }

  async hasListAccess(userId: number, listId: number): Promise<{ hasAccess: boolean; role?: string }> {
    const list = await this.getList(listId);
    if (!list) return { hasAccess: false };

    // Owner always has access
    if (list.userId === userId) {
      return { hasAccess: true, role: 'owner' };
    }

    // Check privacy level
    if (list.privacyLevel === 'public') {
      return { hasAccess: true, role: 'public' };
    }

    if (list.privacyLevel === 'connections') {
      // Check if user is a connection (friend)
      const friendship = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userId, list.userId),
            eq(friendships.friendId, userId),
            eq(friendships.status, 'accepted')
          )
        )
        .limit(1);

      if (friendship.length > 0) {
        return { hasAccess: true, role: 'connection' };
      }
    }

    // Check explicit access for private lists
    const access = await db
      .select()
      .from(listAccess)
      .where(
        and(
          eq(listAccess.listId, listId),
          eq(listAccess.userId, userId),
          eq(listAccess.status, 'accepted')
        )
      )
      .limit(1);

    if (access.length > 0) {
      return { hasAccess: true, role: access[0].role };
    }

    return { hasAccess: false };
  }

  async removeListAccess(listId: number, userId: number): Promise<void> {
    await db
      .delete(listAccess)
      .where(
        and(
          eq(listAccess.listId, listId),
          eq(listAccess.userId, userId)
        )
      );
  }

  async createAccessRequest(listId: number, userId: number, requestedRole: string, message?: string): Promise<void> {
    await db.insert(accessRequests).values({
      listId,
      userId,
      requestedRole,
      message: message || null,
      status: 'pending'
    });

    // Notify list owner
    const list = await this.getList(listId);
    if (list) {
      await this.createNotification({
        userId: list.userId,
        type: 'access_request',
        message: `Someone requested access to your list "${list.name}"`,
        metadata: { listId, requesterId: userId, requestedRole }
      });
    }
  }

  async getAccessRequests(listId: number): Promise<Array<{ id: number; userId: number; requestedRole: string; message?: string; user: any }>> {
    const result = await db
      .select({
        id: accessRequests.id,
        userId: accessRequests.userId,
        requestedRole: accessRequests.requestedRole,
        message: accessRequests.message,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.userId, users.id))
      .where(
        and(
          eq(accessRequests.listId, listId),
          eq(accessRequests.status, 'pending')
        )
      );

    return result.map(r => ({
      id: r.id,
      userId: r.userId,
      requestedRole: r.requestedRole,
      message: r.message || undefined,
      user: r.user
    }));
  }

  async respondToAccessRequest(requestId: number, action: string): Promise<void> {
    const request = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (request.length === 0) return;

    const accessRequest = request[0];

    // Update request status
    await db
      .update(accessRequests)
      .set({ 
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: new Date()
      })
      .where(eq(accessRequests.id, requestId));

    // If approved, grant access
    if (action === 'approve') {
      await db.insert(listAccess).values({
        listId: accessRequest.listId,
        userId: accessRequest.userId,
        role: accessRequest.requestedRole,
        status: 'accepted',
        invitedBy: accessRequest.userId // Self-approved through request
      });
    }

    // Notify requester
    const list = await this.getList(accessRequest.listId);
    if (list) {
      await this.createNotification({
        userId: accessRequest.userId,
        type: 'access_response',
        message: action === 'approve' 
          ? `Your request to access "${list.name}" was approved`
          : `Your request to access "${list.name}" was declined`,
        metadata: { listId: accessRequest.listId, action }
      });
    }
  }

  // Friend request methods
  async sendFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
    // Check if request already exists
    const existing = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromUserId),
          eq(friendRequests.toUserId, toUserId),
          eq(friendRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existing.length > 0) return;

    // Create friend request
    await db.insert(friendRequests).values({
      fromUserId,
      toUserId,
      status: 'pending'
    });

    // Create notification (simplified to avoid schema issues)
    try {
      await db.insert(notifications).values({
        userId: toUserId,
        type: 'friend_request',
        fromUserId: fromUserId,
        postId: null,
        categoryId: null
      });
    } catch (error) {
      console.log('Notification creation failed:', error);
      // Continue without notification for now
    }
  }

  async getOutgoingFriendRequests(userId: number): Promise<Array<{ id: number; toUser: User; createdAt: Date }>> {
    const requests = await db
      .select({
        id: friendRequests.id,
        createdAt: friendRequests.createdAt,
        toUser: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(friendRequests)
      .leftJoin(users, eq(friendRequests.toUserId, users.id))
      .where(
        and(
          eq(friendRequests.fromUserId, userId),
          eq(friendRequests.status, 'pending')
        )
      );

    return requests.map(r => ({
      id: r.id,
      toUser: r.toUser as User,
      createdAt: r.createdAt
    }));
  }

  async getUserLike(postId: number, userId: number): Promise<boolean> {
    return this.isPostLiked(postId, userId);
  }

  async repostPost(postId: number, userId: number): Promise<void> {
    // Check if already reposted
    const existing = await db
      .select()
      .from(reposts)
      .where(
        and(
          eq(reposts.postId, postId),
          eq(reposts.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(reposts).values({
      postId,
      userId
    });
  }

  async flagPost(postId: number, userId: number, reason: string, comment?: string): Promise<void> {
    await db.insert(postFlags).values({
      postId,
      userId,
      reason,
      comment
    });
  }

  async tagFriendInPost(postId: number, userId: number, taggedUserId: number): Promise<void> {
    await db.insert(taggedPosts).values({
      postId,
      userId: taggedUserId,
      taggedBy: userId
    });
  }

  async getUserTotalShares(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(postShares)
      .where(eq(postShares.userId, userId));
    
    return result[0]?.count || 0;
  }

  async getFriendsOrderedByRecentTags(userId: number): Promise<User[]> {
    const friends = await this.getFriends(userId);
    return friends.map(f => f as User);
  }

  async isFollowingHashtag(userId: number, hashtagId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(hashtagFollows)
      .where(
        and(
          eq(hashtagFollows.userId, userId),
          eq(hashtagFollows.hashtagId, hashtagId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async getTaggedPosts(userId: number): Promise<PostWithUser[]> {
    const taggedPostIds = await db
      .select({ postId: taggedPosts.postId })
      .from(taggedPosts)
      .where(eq(taggedPosts.userId, userId));

    if (taggedPostIds.length === 0) return [];

    const posts = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        primaryPhotoUrl: posts.primaryPhotoUrl,
        additionalPhotos: posts.additionalPhotos,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        userId: posts.userId,
        listId: posts.listId,
        privacy: posts.privacy,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(inArray(posts.id, taggedPostIds.map(t => t.postId)))
      .orderBy(desc(posts.createdAt));

    return posts.map(p => ({
      ...p,
      user: p.user as User
    })) as PostWithUser[];
  }

  async markNotificationAsViewed(notificationId: number): Promise<void> {
    await this.markNotificationAsRead(notificationId);
  }

  // Additional missing methods
  async getRsvp(eventId: number, userId: number): Promise<Rsvp | undefined> {
    const [rsvp] = await db
      .select()
      .from(rsvps)
      .where(
        and(
          eq(rsvps.eventId, eventId),
          eq(rsvps.userId, userId)
        )
      )
      .limit(1);

    return rsvp || undefined;
  }

  async updateRsvp(eventId: number, userId: number, status: string): Promise<void> {
    await db
      .update(rsvps)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(rsvps.eventId, eventId),
          eq(rsvps.userId, userId)
        )
      );
  }

  async createRsvp(eventId: number, userId: number, status: string): Promise<void> {
    await db.insert(rsvps).values({
      eventId,
      userId,
      status
    });
  }

  async getRsvpStats(eventId: number): Promise<{ going: number; maybe: number; notGoing: number }> {
    const stats = await db
      .select({
        status: rsvps.status,
        count: count()
      })
      .from(rsvps)
      .where(eq(rsvps.eventId, eventId))
      .groupBy(rsvps.status);

    const result = { going: 0, maybe: 0, notGoing: 0 };
    stats.forEach(stat => {
      if (stat.status === 'going') result.going = stat.count;
      else if (stat.status === 'maybe') result.maybe = stat.count;
      else if (stat.status === 'not_going') result.notGoing = stat.count;
    });

    return result;
  }

  async getRsvpList(eventId: number): Promise<Array<{ user: User; status: string }>> {
    const rsvps = await db
      .select({
        status: rsvps.status,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(rsvps)
      .leftJoin(users, eq(rsvps.userId, users.id))
      .where(eq(rsvps.eventId, eventId));

    return rsvps.map(r => ({
      user: r.user as User,
      status: r.status
    }));
  }

  async getReports(): Promise<Report[]> {
    return db.select().from(reports);
  }

  async deleteReport(reportId: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, reportId));
  }

  async getAnalytics(): Promise<any> {
    const userCount = await db.select({ count: count() }).from(users);
    const postCount = await db.select({ count: count() }).from(posts);
    
    return {
      users: userCount[0]?.count || 0,
      posts: postCount[0]?.count || 0
    };
  }

  async flagUser(userId: number, flaggedBy: number, reason: string): Promise<void> {
    await db.insert(blacklist).values({
      userId,
      flaggedBy,
      reason
    });
  }

  async unflagUser(userId: number): Promise<void> {
    await db.delete(blacklist).where(eq(blacklist.userId, userId));
  }

  async trackView(postId: number, userId: number): Promise<void> {
    // Check if view already exists today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existing = await db
      .select()
      .from(postViews)
      .where(
        and(
          eq(postViews.postId, postId),
          eq(postViews.userId, userId),
          sql`DATE(${postViews.createdAt}) = DATE(${today})`
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(postViews).values({
        postId,
        userId
      });
    }
  }

  async getPostViews(postId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(postViews)
      .where(eq(postViews.postId, postId));

    return result[0]?.count || 0;
  }

  async isSaved(postId: number, userId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(savedPosts)
      .where(
        and(
          eq(savedPosts.postId, postId),
          eq(savedPosts.userId, userId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async isReposted(postId: number, userId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(reposts)
      .where(
        and(
          eq(reposts.postId, postId),
          eq(reposts.userId, userId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async getReposts(postId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(reposts)
      .where(eq(reposts.postId, postId));

    return result[0]?.count || 0;
  }

  async checkAutoDelete(postId: number): Promise<boolean> {
    return false; // Not implemented
  }

  async unflagPost(postId: number, userId: number): Promise<void> {
    await db
      .delete(postFlags)
      .where(
        and(
          eq(postFlags.postId, postId),
          eq(postFlags.userId, userId)
        )
      );
  }

  async getPostFlags(postId: number): Promise<PostFlag[]> {
    return db.select().from(postFlags).where(eq(postFlags.postId, postId));
  }

  async tagFriendsToPost(postId: number, friendIds: number[], taggedBy: number): Promise<void> {
    for (const friendId of friendIds) {
      await this.tagFriendInPost(postId, taggedBy, friendId);
    }
  }

  async getSharedWithMePosts(userId: number): Promise<PostWithUser[]> {
    return this.getTaggedPosts(userId);
  }

  async markTaggedPostViewed(postId: number, userId: number): Promise<void> {
    await this.trackView(postId, userId);
  }
}

export const storage = new DatabaseStorage();