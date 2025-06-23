import { users, type User, type InsertUser, type UserWithFriends, posts, type Post, type PostWithUser, type InsertPost, 
  lists, type List, type ListWithPosts, type InsertList, listAccess, friendships, notifications, type Notification, type CreateNotificationData,
  hashtags, type Hashtag, postHashtags, comments, type Comment, type CommentWithUser, type InsertComment, 
  postLikes, postShares, postViews, savedPosts, reposts, friendRequests, accessRequests, postFlags, 
  blacklist, reports, postTags, taggedPosts, profileEnergyRatings, postEnergyRatings, rsvps, hashtagFollows, urlClicks } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, like, exists, not, inArray, count, avg, gte, lt } from 'drizzle-orm';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithFriends(id: number): Promise<UserWithFriends | undefined>;
  searchUsers(query: string): Promise<User[]>;
  updateUser(userId: number, updates: Partial<User>): Promise<void>;
  updateUserPrivacy(userId: number, privacy: string): Promise<void>;
  deleteUser(userId: number): Promise<void>;

  // List methods - Enterprise Scale
  createList(list: InsertList & { userId: number }): Promise<List>;
  getListsByUserId(userId: number): Promise<ListWithPosts[]>;
  getList(id: number): Promise<List | undefined>;
  getListWithPosts(id: number): Promise<ListWithPosts | undefined>;
  getListsWithAccess(viewerId?: number): Promise<ListWithPosts[]>;
  updateListPrivacy(listId: number, privacyLevel: string): Promise<void>;
  deleteList(listId: number): Promise<void>;
  getListWithCreator(id: number): Promise<any>;
  getListById(listId: number): Promise<List | undefined>;
  
  // List access control - Enterprise Collaboration
  inviteToList(listId: number, userId: number, role: string, invitedBy: number): Promise<void>;
  addListCollaborator(listId: number, userId: number, role: string, invitedBy: number): Promise<void>;
  respondToListInvite(accessId: number, action: string): Promise<void>;
  respondToListInviteByUserAndList(userId: number, listId: number, action: string): Promise<void>;
  getListAccess(listId: number): Promise<Array<{ userId: number; role: string; status: string; user: any }>>;
  getUserListAccess(userId: number): Promise<Array<{ listId: number; role: string; status: string; list: any }>>;
  getPendingListInvitations(userId: number): Promise<Array<{ listId: number; role: string; status: string; list: any; invitedBy: any }>>;
  hasListAccess(userId: number, listId: number): Promise<{ hasAccess: boolean; role?: string }>;
  removeListAccess(listId: number, userId: number): Promise<void>;
  createAccessRequest(listId: number, userId: number, requestedRole: string, message?: string): Promise<void>;
  getAccessRequests(listId: number): Promise<Array<{ id: number; userId: number; requestedRole: string; message?: string; user: any }>>;
  respondToAccessRequest(requestId: number, action: string): Promise<void>;
  
  // Post methods - Content Management
  createPost(post: InsertPost & { userId: number; listId?: number; hashtags?: string[]; taggedUsers?: number[] }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(viewerId?: number): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByListId(listId: number): Promise<PostWithUser[]>;
  getPostsByHashtag(hashtagName: string, viewerId?: number): Promise<PostWithUser[]>;
  getPostsByMultipleHashtags(hashtagNames: string[]): Promise<PostWithUser[]>;
  getPostsByPrivacy(privacy: string, userId?: number): Promise<PostWithUser[]>;
  deletePost(postId: number): Promise<void>;
  updatePost(postId: number, updates: Partial<Post>): Promise<void>;
  getTaggedPosts(userId: number): Promise<PostWithUser[]>;
  getFriendsPosts(userId: number): Promise<PostWithUser[]>;

  // Engagement - Likes, Shares, Views
  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  isPostLiked(postId: number, userId: number): Promise<boolean>;
  getPostLikeCount(postId: number): Promise<number>;
  getUserLike(postId: number, userId: number): Promise<boolean>;
  sharePost(postId: number, userId: number): Promise<void>;
  getPostShareCount(postId: number): Promise<number>;
  getUserTotalShares(userId: number): Promise<number>;
  recordPostView(postId: number, userId?: number): Promise<void>;
  getPostViewCount(postId: number): Promise<number>;
  trackView(postId: number, userId: number): Promise<void>;
  getPostViews(postId: number): Promise<number>;

  // Repost system
  repost(postId: number, userId: number): Promise<void>;
  unrepost(postId: number, userId: number): Promise<void>;
  isReposted(postId: number, userId: number): Promise<boolean>;
  getReposts(postId: number): Promise<number>;
  repostPost(postId: number, userId: number): Promise<void>;

  // Save system
  savePost(postId: number, userId: number): Promise<void>;
  unsavePost(postId: number, userId: number): Promise<void>;
  isSaved(postId: number, userId: number): Promise<boolean>;
  getSavedPosts(userId: number): Promise<PostWithUser[]>;

  // Comments
  createComment(comment: InsertComment & { postId: number; userId: number }): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;
  deleteComment(commentId: number): Promise<void>;

  // Hashtag system - Discovery & Following
  createHashtag(name: string): Promise<Hashtag>;
  getHashtagsByPostId(postId: number): Promise<Hashtag[]>;
  getTrendingHashtags(limit?: number): Promise<Hashtag[]>;
  followHashtag(userId: number, hashtagId: number): Promise<void>;
  unfollowHashtag(userId: number, hashtagId: number): Promise<void>;
  getFollowedHashtags(userId: number): Promise<Hashtag[]>;
  isFollowingHashtag(userId: number, hashtagId: number): Promise<boolean>;

  // Tagging system
  tagFriendInPost(postId: number, userId: number, taggedUserId: number): Promise<void>;
  tagFriendsToPost(postId: number, friendIds: number[], taggedBy: number): Promise<void>;

  // Moderation & Safety
  flagPost(postId: number, userId: number, reason: string, comment?: string): Promise<void>;
  unflagPost(postId: number, userId: number): Promise<void>;
  getPostFlags(postId: number): Promise<any[]>;
  checkAutoDelete(postId: number): Promise<boolean>;
  createReport(report: any): Promise<any>;
  getReports(): Promise<any[]>;
  deleteReport(reportId: number): Promise<void>;
  flagUser(userId: number, flaggedBy: number, reason: string): Promise<void>;
  unflagUser(userId: number): Promise<void>;

  // Analytics & Stats
  getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }>;
  getUserEnergyStats(userId: number): Promise<{ average: number; count: number }>;
  getAnalytics(): Promise<any>;

  // Social Network - Connections (formerly Friends)
  getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>>;
  getFriends(userId: number): Promise<User[]>;
  getFriendsOrderedByRecentTags(userId: number): Promise<User[]>;
  sendFriendRequest(fromUserId: number, toUserId: number): Promise<void>;
  getFriendRequests(userId: number): Promise<any[]>;
  getOutgoingFriendRequests(userId: number): Promise<Array<{ id: number; toUser: User; createdAt: Date }>>;
  respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void>;
  areFriends(userId1: number, userId2: number): Promise<boolean>;

  // Events & RSVP
  getRsvp(eventId: number, userId: number): Promise<any>;
  createRsvp(eventId: number, userId: number, status: string): Promise<void>;
  updateRsvp(eventId: number, userId: number, status: string): Promise<void>;
  getRsvpStats(eventId: number): Promise<{ going: number; maybe: number; notGoing: number }>;
  getRsvpList(eventId: number, status?: string): Promise<Array<{ user: User; status: string }>>;

  // Notifications
  createNotification(notification: CreateNotificationData): Promise<Notification>;
  getNotifications(userId: number): Promise<any[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  markNotificationAsViewed(notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Privacy & Blocking
  getBlacklist(userId: number): Promise<any[]>;
  addToBlacklist(userId: number, blockedUserId: number): Promise<void>;
  getSharedWithMePosts(userId: number): Promise<PostWithUser[]>;
  markTaggedPostViewed(postId: number, userId: number): Promise<void>;

  // Energy Rating System
  getPostEnergyStats(postId: number): Promise<{ average: number; count: number }>;
  getUserPostEnergyRating(postId: number, userId: number): Promise<number | null>;
  submitPostEnergyRating(postId: number, userId: number, rating: number): Promise<void>;
  getProfileEnergyStats(profileId: number): Promise<{ average: number; count: number }>;
  getUserProfileEnergyRating(profileId: number, userId: number): Promise<number | null>;
  submitProfileEnergyRating(profileId: number, userId: number, rating: number): Promise<void>;
}

export class EnterpriseStorage implements IStorage {
  // CORE USER METHODS
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
      friends: friends || [],
      friendCount: friends?.length || 0,
      relationshipStatus: 'none'
    } as UserWithFriends;
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          or(
            like(users.username, `%${query}%`),
            like(users.name, `%${query}%`)
          ),
          not(like(users.username, 'deleted_user_%')),
          not(eq(users.name, 'Deleted User'))
        )
      )
      .limit(20);
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  async updateUserPrivacy(userId: number, privacy: string): Promise<void> {
    await db
      .update(users)
      .set({ defaultPrivacy: privacy })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    // Implement soft delete by marking user as deleted
    const timestamp = Math.floor(Date.now() / 1000);
    await db.update(users)
      .set({ 
        username: `deleted_user_${userId}_${timestamp}`,
        password: 'DELETED',
        name: 'Deleted User'
      })
      .where(eq(users.id, userId));
  }

  // ENTERPRISE LIST MANAGEMENT
  async createList(listData: InsertList & { userId: number }): Promise<List> {
    const [list] = await db
      .insert(lists)
      .values({
        name: listData.name,
        description: listData.description,
        isPublic: listData.isPublic,
        privacyLevel: listData.privacyLevel || 'public',
        userId: listData.userId
      })
      .returning();

    return list;
  }

  async getListsByUserId(userId: number): Promise<ListWithPosts[]> {
    // Get lists owned by user
    const ownedLists = await db
      .select({
        list: lists,
        postCount: count(posts.id),
        role: sql<string>`'owner'`
      })
      .from(lists)
      .leftJoin(posts, eq(lists.id, posts.listId))
      .where(eq(lists.userId, userId))
      .groupBy(lists.id)
      .orderBy(desc(lists.createdAt));

    // Get lists where user has collaborative access
    const collaborativeLists = await db
      .select({
        list: lists,
        postCount: count(posts.id),
        role: listAccess.role
      })
      .from(listAccess)
      .innerJoin(lists, eq(listAccess.listId, lists.id))
      .leftJoin(posts, eq(lists.id, posts.listId))
      .where(and(
        eq(listAccess.userId, userId),
        eq(listAccess.status, 'accepted')
      ))
      .groupBy(lists.id, listAccess.role)
      .orderBy(desc(lists.createdAt));

    // Combine both result sets
    const allResults = [...ownedLists, ...collaborativeLists];
    
    const listsWithPosts = await Promise.all(
      allResults.map(async (row) => {
        const listPosts = await this.getPostsByListId(row.list.id);
        return {
          ...row.list,
          posts: listPosts,
          postCount: row.postCount,
          firstPostImage: listPosts[0]?.primaryPhotoUrl,
          userRole: row.role // Add role information
        };
      })
    );

    return listsWithPosts;
  }

  async getList(id: number): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list || undefined;
  }

  async getListById(listId: number): Promise<List | undefined> {
    return this.getList(listId);
  }

  async getListWithCreator(id: number): Promise<any> {
    const result = await db
      .select({
        list: lists,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(lists)
      .leftJoin(users, eq(lists.userId, users.id))
      .where(eq(lists.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].list,
      user: result[0].user
    };
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

  async getListsWithAccess(viewerId?: number): Promise<ListWithPosts[]> {
    if (!viewerId) {
      // Return only public lists for unauthenticated users
      const result = await db
        .select()
        .from(lists)
        .where(eq(lists.privacyLevel, 'public'))
        .orderBy(desc(lists.createdAt));

      return Promise.all(
        result.map(async (list) => {
          const posts = await this.getPostsByListId(list.id);
          return {
            ...list,
            posts,
            postCount: posts.length,
            firstPostImage: posts[0]?.primaryPhotoUrl
          };
        })
      );
    }
    
    return this.getListsByUserId(viewerId);
  }

  async updateListPrivacy(listId: number, privacyLevel: string): Promise<void> {
    await db
      .update(lists)
      .set({ privacyLevel })
      .where(eq(lists.id, listId));
  }

  async deleteList(listId: number): Promise<void> {
    // Delete associated posts first
    await db.delete(posts).where(eq(posts.listId, listId));
    // Delete the list
    await db.delete(lists).where(eq(lists.id, listId));
  }

  // LIST ACCESS CONTROL - ENTERPRISE COLLABORATION
  async inviteToList(listId: number, userId: number, role: string, invitedBy: number): Promise<void> {
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
      await db
        .update(listAccess)
        .set({ 
          role, 
          status: 'pending',
          invitedBy
        })
        .where(eq(listAccess.id, existing[0].id));
    } else {
      await db.insert(listAccess).values({
        listId,
        userId,
        role,
        status: 'pending',
        invitedBy
      });
    }

    // Create notification
    await this.createNotification({
      userId,
      type: 'list_invite',
      postId: listId
    });
  }

  async addListCollaborator(listId: number, userId: number, role: string, invitedBy: number): Promise<void> {
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
      await db
        .update(listAccess)
        .set({ 
          role, 
          status: 'accepted',
          invitedBy
        })
        .where(eq(listAccess.id, existing[0].id));
    } else {
      await db.insert(listAccess).values({
        listId,
        userId,
        role,
        status: 'accepted',
        invitedBy
      });
    }

    // Create notification for direct collaboration add
    await this.createNotification({
      userId,
      type: 'list_invite',
      postId: listId,
      fromUserId: invitedBy
    });
  }

  async respondToListInvite(accessId: number, action: string): Promise<void> {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await db
      .update(listAccess)
      .set({ status, updatedAt: new Date() })
      .where(eq(listAccess.id, accessId));
  }

  async respondToListInviteByUserAndList(userId: number, listId: number, action: string): Promise<void> {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await db
      .update(listAccess)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(listAccess.userId, userId),
        eq(listAccess.listId, listId),
        eq(listAccess.status, 'pending')
      ));
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

  async getPendingListInvitations(userId: number): Promise<Array<{ listId: number; role: string; status: string; list: any; invitedBy: any }>> {
    const result = await db
      .select({
        listId: listAccess.listId,
        role: listAccess.role,
        status: listAccess.status,
        list: {
          id: lists.id,
          name: lists.name,
          description: lists.description,
          privacyLevel: lists.privacyLevel
        },
        invitedBy: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }
      })
      .from(listAccess)
      .leftJoin(lists, eq(listAccess.listId, lists.id))
      .leftJoin(users, eq(listAccess.invitedBy, users.id))
      .where(and(
        eq(listAccess.userId, userId),
        eq(listAccess.status, 'pending')
      ))
      .orderBy(desc(listAccess.createdAt));

    return result.map(r => ({
      id: r.listId, // For frontend compatibility
      listId: r.listId,
      role: r.role,
      status: r.status,
      list: r.list,
      invitedBy: r.invitedBy
    }));
  }

  async hasListAccess(userId: number, listId: number): Promise<{ hasAccess: boolean; role?: string }> {
    // Check if user is the list owner
    const [list] = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1);
    if (list) return { hasAccess: true, role: 'owner' };

    // Check if user has been granted access
    const [access] = await db.select().from(listAccess).where(and(eq(listAccess.listId, listId), eq(listAccess.userId, userId), eq(listAccess.status, 'accepted'))).limit(1);
    if (access) return { hasAccess: true, role: access.role };
    
    return { hasAccess: false };
  }

  async removeListAccess(listId: number, userId: number): Promise<void> {
    await db.delete(listAccess).where(and(eq(listAccess.listId, listId), eq(listAccess.userId, userId)));
  }

  async createAccessRequest(listId: number, userId: number, requestedRole: string, message?: string): Promise<void> {
    await db.insert(accessRequests).values({
      listId,
      userId,
      requestedRole,
      message: message || null
    });
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
      .where(eq(accessRequests.listId, listId));

    return result.map(r => ({
      id: r.id,
      userId: r.userId,
      requestedRole: r.requestedRole,
      message: r.message || undefined,
      user: r.user
    }));
  }

  async respondToAccessRequest(requestId: number, action: string): Promise<void> {
    if (action === 'accept') {
      const [request] = await db.select().from(accessRequests).where(eq(accessRequests.id, requestId)).limit(1);
      if (request) {
        await db.insert(listAccess).values({
          listId: request.listId,
          userId: request.userId,
          role: request.requestedRole,
          status: 'accepted',
          invitedBy: request.userId // Self-accepted through request
        });
      }
    }
    
    await db.delete(accessRequests).where(eq(accessRequests.id, requestId));
  }

  // CONTENT MANAGEMENT - BULLETPROOF PRIVACY
  async createPost(postData: InsertPost & { 
    userId: number; 
    listId?: number; 
    hashtags?: string[]; 
    taggedUsers?: number[];
    privacy?: string;
    additionalPhotoData?: any;
    mediaMetadata?: any;
    reminders?: string[];
    isRecurring?: boolean;
    recurringType?: string;
    taskList?: any[];
    attachedLists?: number[];
  }): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        userId: postData.userId,
        listId: postData.listId,
        primaryPhotoUrl: postData.primaryPhotoUrl,
        primaryLink: postData.primaryLink,
        linkLabel: postData.linkLabel,
        primaryDescription: postData.primaryDescription,
        privacy: postData.privacy || 'public',
        discountCode: postData.discountCode,
        additionalPhotos: postData.additionalPhotos,
        additionalPhotoData: postData.additionalPhotoData,
        spotifyUrl: postData.spotifyUrl,
        spotifyLabel: postData.spotifyLabel,
        youtubeUrl: postData.youtubeUrl,
        youtubeLabel: postData.youtubeLabel,
        mediaMetadata: postData.mediaMetadata,
        isEvent: postData.isEvent || false,
        eventDate: postData.eventDate,
        reminders: postData.reminders,
        isRecurring: postData.isRecurring || false,
        recurringType: postData.recurringType,
        taskList: postData.taskList,
        attachedLists: postData.attachedLists,
        allowRsvp: postData.allowRsvp || false,
        engagement: 0
      })
      .returning();

    // Handle hashtags
    if (postData.hashtags && postData.hashtags.length > 0) {
      for (const hashtagName of postData.hashtags) {
        const hashtag = await this.getOrCreateHashtag(hashtagName);
        await db.insert(postHashtags).values({
          postId: post.id,
          hashtagId: hashtag.id
        }).onConflictDoNothing();
      }
    }

    // Handle tagged users
    if (postData.taggedUsers && postData.taggedUsers.length > 0) {
      for (const taggedUserId of postData.taggedUsers) {
        await db.insert(taggedPosts).values({
          postId: post.id,
          toUserId: taggedUserId,
          fromUserId: postData.userId
        }).onConflictDoNothing();

        // Create notification for tagged user
        await this.createNotification({
          userId: taggedUserId,
          type: 'tag',
          postId: post.id,
          fromUserId: postData.userId
        });
      }
    }

    return post;
  }

  private async getOrCreateHashtag(name: string): Promise<Hashtag> {
    const [existing] = await db.select().from(hashtags).where(eq(hashtags.name, name)).limit(1);
    if (existing) return existing;
    
    const [hashtag] = await db.insert(hashtags).values({ name }).returning();
    return hashtag;
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    
    // Fetch hashtags for this post
    const postHashtagsResult = await db
      .select({
        hashtag: hashtags
      })
      .from(postHashtags)
      .leftJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(eq(postHashtags.postId, id));

    const hashtagsArray = postHashtagsResult.map(row => row.hashtag).filter(Boolean);

    return {
      ...row.post,
      user: row.user!,
      list: row.list || undefined,
      hashtags: hashtagsArray
    } as PostWithUser;
  }

  // BULLETPROOF THREE-TIER PRIVACY SYSTEM
  async getAllPosts(viewerId?: number): Promise<PostWithUser[]> {
    // Get all posts with user and list data
    const allPosts = await db
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .orderBy(desc(posts.createdAt));

    if (!viewerId) {
      // Anonymous users: only public posts (with or without lists, but if list exists it must be public)
      return allPosts
        .filter(r => r.post.privacy === 'public' && (!r.list || r.list.privacyLevel === 'public'))
        .map(r => ({
          ...r.post,
          user: r.user!,
          list: r.list || undefined
        })) as PostWithUser[];
    }

    const filteredPosts = [];
    
    for (const row of allPosts) {
      const post = row.post;
      const user = row.user!;
      const list = row.list;

      // Users can always see their own posts
      if (post.userId === viewerId) {
        filteredPosts.push({
          ...post,
          user,
          list: list || undefined
        });
        continue;
      }

      // Determine the effective privacy level (post privacy or list privacy - whichever is more restrictive)
      const effectivePrivacy = this.getEffectivePrivacy(post.privacy, list?.privacyLevel);

      if (effectivePrivacy === 'public') {
        // Public posts - visible to everyone
        filteredPosts.push({
          ...post,
          user,
          list: list || undefined
        });
      } else if (effectivePrivacy === 'connections') {
        // Connections-only posts - check if viewer is connected to author
        const isConnected = await this.areFriends(viewerId, post.userId);
        if (isConnected) {
          filteredPosts.push({
            ...post,
            user,
            list: list || undefined
          });
        }
      } else if (effectivePrivacy === 'private') {
        // Private posts - check if viewer has list access or is tagged
        let hasAccess = false;

        // Check list access if post is in a list
        if (post.listId) {
          const accessResult = await this.hasListAccess(viewerId, post.listId);
          hasAccess = accessResult.hasAccess;
        }

        // If no list access, check if tagged in post (simplified for now)
        if (!hasAccess) {
          // Note: Tagged posts feature will be implemented when schema is available
          hasAccess = false;
        }

        if (hasAccess) {
          filteredPosts.push({
            ...post,
            user,
            list: list || undefined
          });
        }
      }
    }

    // Fetch hashtags for all posts
    const postIds = filteredPosts.map(post => post.id);
    if (postIds.length > 0) {
      const hashtagsResult = await db
        .select({
          postId: postHashtags.postId,
          hashtag: hashtags
        })
        .from(postHashtags)
        .leftJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
        .where(inArray(postHashtags.postId, postIds));

      // Group hashtags by post ID
      const hashtagsByPost: Record<number, any[]> = {};
      hashtagsResult.forEach(row => {
        if (row.hashtag) {
          if (!hashtagsByPost[row.postId]) {
            hashtagsByPost[row.postId] = [];
          }
          hashtagsByPost[row.postId].push(row.hashtag);
        }
      });

      // Add hashtags to each post
      filteredPosts.forEach(post => {
        (post as any).hashtags = hashtagsByPost[post.id] || [];
      });
    }

    return filteredPosts as PostWithUser[];
  }

  // Helper method to determine effective privacy level
  private getEffectivePrivacy(postPrivacy: string, listPrivacy?: string): string {
    // If no list, use post privacy
    if (!listPrivacy) return postPrivacy;
    
    // Return the most restrictive privacy level
    const privacyLevels: Record<string, number> = { 'public': 0, 'connections': 1, 'private': 2 };
    const postLevel = privacyLevels[postPrivacy] || 0;
    const listLevel = privacyLevels[listPrivacy] || 0;
    
    const maxLevel = Math.max(postLevel, listLevel);
    return Object.keys(privacyLevels).find(key => privacyLevels[key] === maxLevel) || 'public';
  }

  // Helper methods for privacy checking
  // BULLETPROOF PRIVACY: Only public posts in public lists are searchable
  async getPostsByHashtag(hashtagName: string, viewerId?: number): Promise<PostWithUser[]> {
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .innerJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(
        and(
          eq(hashtags.name, hashtagName),
          eq(posts.privacy, 'public'),
          eq(lists.privacyLevel, 'public')
        )
      )
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  // BULLETPROOF PRIVACY: Find posts that contain ALL selected hashtags (AND logic)
  async getPostsByMultipleHashtags(hashtagNames: string[]): Promise<PostWithUser[]> {
    if (hashtagNames.length === 0) return [];
    
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        },
        hashtagCount: count()
      })
      .from(posts)
      .innerJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(
        and(
          inArray(hashtags.name, hashtagNames),
          eq(posts.privacy, 'public'),
          eq(lists.privacyLevel, 'public')
        )
      )
      .groupBy(posts.id, users.id, users.username, users.name, users.profilePictureUrl, lists.id, lists.name, lists.privacyLevel)
      .having(sql`count(*) = ${hashtagNames.length}`)
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
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
        list: {
          id: lists.id,
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(posts.privacy, privacy))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  async deletePost(postId: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, postId));
  }

  async updatePost(postId: number, updates: Partial<Post>): Promise<void> {
    await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, postId));
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
        list: {
          id: lists.id,
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .innerJoin(taggedPosts, eq(posts.id, taggedPosts.postId))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(taggedPosts.toUserId, userId))
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  async getFriendsPosts(userId: number): Promise<PostWithUser[]> {
    const userFriendships = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId));

    if (userFriendships.length === 0) return [];

    const friendIds = userFriendships.map(f => f.friendId);

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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(
        and(
          inArray(posts.userId, friendIds),
          or(
            eq(posts.privacy, 'public'),
            eq(posts.privacy, 'connections')
          )
        )
      )
      .orderBy(desc(posts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  // ENGAGEMENT METHODS
  async likePost(postId: number, userId: number): Promise<void> {
    await db.insert(postLikes).values({ postId, userId }).onConflictDoNothing();
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }

  async isPostLiked(postId: number, userId: number): Promise<boolean> {
    const [like] = await db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))).limit(1);
    return !!like;
  }

  async getUserLike(postId: number, userId: number): Promise<boolean> {
    return this.isPostLiked(postId, userId);
  }

  async getPostLikeCount(postId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));
    return result.count;
  }

  async sharePost(postId: number, userId: number): Promise<void> {
    await db.insert(postShares).values({ postId, userId }).onConflictDoNothing();
  }

  async getPostShareCount(postId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postShares).where(eq(postShares.postId, postId));
    return result.count;
  }

  async getUserTotalShares(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postShares).where(eq(postShares.userId, userId));
    return result.count;
  }

  async recordPostView(postId: number, userId?: number): Promise<void> {
    await db.insert(postViews).values({ 
      postId, 
      userId: userId || null,
      viewType: 'view'
    }).onConflictDoNothing();
  }

  async trackView(postId: number, userId: number): Promise<void> {
    await this.recordPostView(postId, userId);
  }

  async getPostViewCount(postId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(postViews).where(eq(postViews.postId, postId));
    return result.count;
  }

  async getPostViews(postId: number): Promise<number> {
    return this.getPostViewCount(postId);
  }

  // REPOST SYSTEM
  async repost(postId: number, userId: number): Promise<void> {
    await db.insert(reposts).values({ originalPostId: postId, userId }).onConflictDoNothing();
  }

  async repostPost(postId: number, userId: number): Promise<void> {
    await this.repost(postId, userId);
  }

  async unrepost(postId: number, userId: number): Promise<void> {
    await db.delete(reposts).where(and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId)));
  }

  async isReposted(postId: number, userId: number): Promise<boolean> {
    const [repost] = await db.select().from(reposts).where(and(eq(reposts.originalPostId, postId), eq(reposts.userId, userId))).limit(1);
    return !!repost;
  }

  async getReposts(postId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(reposts).where(eq(reposts.originalPostId, postId));
    return result.count;
  }

  // SAVE SYSTEM
  async savePost(postId: number, userId: number): Promise<void> {
    await db.insert(savedPosts).values({ 
      postId: postId,
      userId: userId, 
      categoryId: 1 
    }).onConflictDoNothing();
  }

  async unsavePost(postId: number, userId: number): Promise<void> {
    await db.delete(savedPosts).where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId)));
  }

  async isSaved(postId: number, userId: number): Promise<boolean> {
    const [saved] = await db.select().from(savedPosts).where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, userId))).limit(1);
    return !!saved;
  }

  async getSavedPosts(userId: number): Promise<PostWithUser[]> {
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
          name: lists.name,
          privacyLevel: lists.privacyLevel
        }
      })
      .from(posts)
      .innerJoin(savedPosts, eq(posts.id, savedPosts.postId))
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(lists, eq(posts.listId, lists.id))
      .where(eq(savedPosts.userId, userId))
      .orderBy(desc(savedPosts.createdAt));

    return result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];
  }

  // COMMENTS
  async createComment(commentData: InsertComment & { postId: number; userId: number }): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({
        postId: commentData.postId,
        userId: commentData.userId,
        text: commentData.text
      })
      .returning();

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
      user: r.user!
    })) as CommentWithUser[];
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, commentId));
  }

  // HASHTAG SYSTEM
  async createHashtag(name: string): Promise<Hashtag> {
    const [hashtag] = await db.insert(hashtags).values({ name }).returning();
    return hashtag;
  }

  async getHashtagsByPostId(postId: number): Promise<Hashtag[]> {
    const result = await db
      .select({ hashtag: hashtags })
      .from(postHashtags)
      .innerJoin(hashtags, eq(postHashtags.hashtagId, hashtags.id))
      .where(eq(postHashtags.postId, postId));

    return result.map(r => r.hashtag);
  }

  async getTrendingHashtags(limit: number = 10): Promise<any[]> {
    const result = await db
      .select({
        id: hashtags.id,
        name: hashtags.name,
        count: count(postHashtags.postId)
      })
      .from(hashtags)
      .leftJoin(postHashtags, eq(hashtags.id, postHashtags.hashtagId))
      .leftJoin(posts, and(
        eq(postHashtags.postId, posts.id),
        eq(posts.privacy, 'public')
      ))
      .leftJoin(lists, and(
        eq(posts.listId, lists.id),
        eq(lists.privacyLevel, 'public')
      ))
      .groupBy(hashtags.id, hashtags.name)
      .orderBy(desc(count(postHashtags.postId)))
      .limit(limit);

    return result;
  }

  async followHashtag(userId: number, hashtagId: number): Promise<void> {
    await db.insert(hashtagFollows).values({ userId, hashtagId }).onConflictDoNothing();
  }

  async unfollowHashtag(userId: number, hashtagId: number): Promise<void> {
    await db.delete(hashtagFollows).where(and(eq(hashtagFollows.userId, userId), eq(hashtagFollows.hashtagId, hashtagId)));
  }

  async getFollowedHashtags(userId: number): Promise<Array<Hashtag & { count: number }>> {
    const result = await db
      .select({ 
        hashtag: hashtags,
        count: sql<number>`count(${postHashtags.postId})::int`
      })
      .from(hashtagFollows)
      .innerJoin(hashtags, eq(hashtagFollows.hashtagId, hashtags.id))
      .leftJoin(postHashtags, eq(hashtags.id, postHashtags.hashtagId))
      .where(eq(hashtagFollows.userId, userId))
      .groupBy(hashtags.id, hashtagFollows.createdAt)
      .orderBy(desc(hashtagFollows.createdAt));

    return result.map(r => ({
      ...r.hashtag,
      count: r.count
    }));
  }

  async isFollowingHashtag(userId: number, hashtagId: number): Promise<boolean> {
    const [follow] = await db.select().from(hashtagFollows).where(and(eq(hashtagFollows.userId, userId), eq(hashtagFollows.hashtagId, hashtagId))).limit(1);
    return !!follow;
  }

  // TAGGING SYSTEM
  async tagFriendInPost(postId: number, userId: number, taggedUserId: number): Promise<void> {
    await db.insert(taggedPosts).values({
      postId,
      fromUserId: userId,
      toUserId: taggedUserId
    }).onConflictDoNothing();

    // Create notification
    await this.createNotification({
      userId: taggedUserId,
      type: 'tag',
      postId,
      fromUserId: userId
    });
  }

  async tagFriendsToPost(postId: number, friendIds: number[], taggedBy: number): Promise<void> {
    for (const friendId of friendIds) {
      await this.tagFriendInPost(postId, taggedBy, friendId);
    }
  }

  // SOCIAL NETWORK - CONNECTIONS
  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2)),
          and(eq(friendships.userId, userId2), eq(friendships.friendId, userId1))
        )
      )
      .limit(1);
    
    return friendship.length > 0;
  }

  async getFriends(userId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(eq(friendships.userId, userId));

    return result.map(r => r.user);
  }

  async getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>> {
    const friends = await this.getFriends(userId);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const friendsWithPosts = await Promise.all(
      friends.map(async (friend) => {
        const [recentPost] = await db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.userId, friend.id),
              gte(posts.createdAt, oneWeekAgo)
            )
          )
          .limit(1);

        return {
          user: friend,
          hasRecentPosts: !!recentPost
        };
      })
    );

    return friendsWithPosts;
  }

  // Stories functionality - get recent posts from connections for story-style viewing
  async getConnectionStories(userId: number): Promise<Array<{ user: User; posts: PostWithUser[]; hasUnseen: boolean }>> {
    // Get all connected friends
    const friendIds = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(and(
        eq(friendships.userId, userId),
        eq(friendships.status, 'accepted')
      ));

    if (friendIds.length === 0) {
      return [];
    }

    // Get posts from last 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    const stories = [];
    
    for (const friendId of friendIds) {
      const friend = await this.getUser(friendId.friendId);
      if (!friend) continue;

      // Get recent posts from this friend
      const recentPosts = await db
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
            name: lists.name,
            privacyLevel: lists.privacyLevel
          }
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .leftJoin(lists, eq(posts.listId, lists.id))
        .where(
          and(
            eq(posts.userId, friendId.friendId),
            gte(posts.createdAt, threeDaysAgo)
          )
        )
        .orderBy(desc(posts.createdAt));

      if (recentPosts.length > 0) {
        // Filter posts based on privacy
        const visiblePosts = [];
        for (const row of recentPosts) {
          const post = row.post;
          const user = row.user!;
          const list = row.list;

          const effectivePrivacy = this.getEffectivePrivacy(post.privacy, list?.privacyLevel);
          
          // Show public posts and connection posts (since they are connected)
          if (effectivePrivacy === 'public' || effectivePrivacy === 'connections') {
            visiblePosts.push({
              ...post,
              user,
              list: list || undefined
            } as PostWithUser);
          }
        }

        if (visiblePosts.length > 0) {
          // Check if user has seen these posts (simplified - could track view history)
          const hasUnseen = true; // For now, assume all are unseen
          
          stories.push({
            user: friend,
            posts: visiblePosts,
            hasUnseen
          });
        }
      }
    }

    // Sort by most recent post
    stories.sort((a, b) => {
      const aLatest = Math.max(...a.posts.map(p => new Date(p.createdAt).getTime()));
      const bLatest = Math.max(...b.posts.map(p => new Date(p.createdAt).getTime()));
      return bLatest - aLatest;
    });

    return stories;
  }

  async getFriendsOrderedByRecentTags(userId: number): Promise<User[]> {
    const friends = await this.getFriends(userId);
    // For now, return friends in basic order
    // Could be enhanced to order by recent tagging activity
    return friends;
  }

  async sendFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
    // Check if request already exists
    const [existing] = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromUserId),
          eq(friendRequests.toUserId, toUserId)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error('Friend request already sent');
    }

    // Check if already friends
    const areFriends = await this.areFriends(fromUserId, toUserId);
    if (areFriends) {
      throw new Error('Already connected with this user');
    }

    await db.insert(friendRequests).values({
      fromUserId,
      toUserId,
      status: 'pending'
    });

    // Create notification
    try {
      await this.createNotification({
        userId: toUserId,
        type: 'friend_request',
        fromUserId
      });
    } catch (error) {
      console.log('Notification creation failed:', error);
      // Don't throw error - friend request was created successfully
    }
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: friendRequests.id,
        fromUser: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        createdAt: friendRequests.createdAt
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.fromUserId, users.id))
      .where(
        and(
          eq(friendRequests.toUserId, userId),
          not(like(users.username, 'deleted_user_%'))
        )
      )
      .orderBy(desc(friendRequests.createdAt));

    return result;
  }

  async getOutgoingFriendRequests(userId: number): Promise<Array<{ id: number; toUser: User; createdAt: Date }>> {
    const result = await db
      .select({
        id: friendRequests.id,
        toUser: {
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        },
        createdAt: friendRequests.createdAt
      })
      .from(friendRequests)
      .innerJoin(users, eq(friendRequests.toUserId, users.id))
      .where(
        and(
          eq(friendRequests.fromUserId, userId),
          not(like(users.username, 'deleted_user_%'))
        )
      )
      .orderBy(desc(friendRequests.createdAt));

    return result.map(r => ({
      id: r.id,
      toUser: r.toUser as User,
      createdAt: r.createdAt
    }));
  }

  async respondToFriendRequest(requestId: number, action: 'accept' | 'reject'): Promise<void> {
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId)).limit(1);
    
    if (!request) return;

    if (action === 'accept') {
      // Check if friendship already exists to prevent duplicates
      const existingFriendship = await db.select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.userId, request.fromUserId), eq(friendships.friendId, request.toUserId)),
            and(eq(friendships.userId, request.toUserId), eq(friendships.friendId, request.fromUserId))
          )
        )
        .limit(1);

      if (existingFriendship.length === 0) {
        // Create bidirectional friendship
        await db.insert(friendships).values([
          { userId: request.fromUserId, friendId: request.toUserId, status: 'accepted' },
          { userId: request.toUserId, friendId: request.fromUserId, status: 'accepted' }
        ]);
      }

      // Create notification for acceptance
      await this.createNotification({
        userId: request.fromUserId,
        type: 'friend_accept',
        fromUserId: request.toUserId
      });
    }

    // Remove the friend request
    await db.delete(friendRequests).where(eq(friendRequests.id, requestId));
  }

  // STATS & ANALYTICS
  async getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }> {
    const [likeCount] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));
    const [commentCount] = await db.select({ count: count() }).from(comments).where(eq(comments.postId, postId));
    const [shareCount] = await db.select({ count: count() }).from(postShares).where(eq(postShares.postId, postId));
    const [viewCount] = await db.select({ count: count() }).from(postViews).where(eq(postViews.postId, postId));

    return {
      likeCount: likeCount.count,
      commentCount: commentCount.count,
      shareCount: shareCount.count,
      viewCount: viewCount.count
    };
  }

  async getUserEnergyStats(userId: number): Promise<{ average: number; count: number }> {
    const [result] = await db
      .select({
        average: avg(profileEnergyRatings.rating),
        count: count()
      })
      .from(profileEnergyRatings)
      .where(eq(profileEnergyRatings.profileId, userId));

    return {
      average: Number(result.average) || 4,
      count: result.count
    };
  }

  async getAnalytics(): Promise<any> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [postCount] = await db.select({ count: count() }).from(posts);
    const [listCount] = await db.select({ count: count() }).from(lists);

    return {
      totalUsers: userCount.count,
      totalPosts: postCount.count,
      totalLists: listCount.count
    };
  }

  // MODERATION & SAFETY
  async flagPost(postId: number, userId: number, reason: string, comment?: string): Promise<void> {
    await db.insert(postFlags).values({
      postId: postId,
      userId: userId,
      reason: reason
    }).onConflictDoNothing();
  }

  async unflagPost(postId: number, userId: number): Promise<void> {
    await db.delete(postFlags).where(and(eq(postFlags.postId, postId), eq(postFlags.userId, userId)));
  }

  async getPostFlags(postId: number): Promise<any[]> {
    return await db.select().from(postFlags).where(eq(postFlags.postId, postId));
  }

  async checkAutoDelete(postId: number): Promise<boolean> {
    // Logic for auto-deletion based on flags
    const flags = await this.getPostFlags(postId);
    return flags.length >= 5; // Example threshold
  }

  async createReport(report: any): Promise<any> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReports(): Promise<any[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async deleteReport(reportId: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, reportId));
  }

  async flagUser(userId: number, flaggedBy: number, reason: string): Promise<void> {
    await db.insert(blacklist).values({
      type: 'user_flag',
      value: userId.toString()
    }).onConflictDoNothing();
  }

  async unflagUser(userId: number): Promise<void> {
    await db.delete(blacklist).where(and(eq(blacklist.type, 'user_flag'), eq(blacklist.value, userId.toString())));
  }

  // PRIVACY & BLOCKING
  async getBlacklist(userId: number): Promise<any[]> {
    return await db.select().from(blacklist).where(eq(blacklist.type, 'blocked_user'));
  }

  async addToBlacklist(userId: number, blockedUserId: number): Promise<void> {
    await db.insert(blacklist).values({
      type: 'blocked_user',
      value: blockedUserId.toString()
    }).onConflictDoNothing();
  }



  // EVENTS & RSVP
  async getRsvp(eventId: number, userId: number): Promise<any> {
    const [rsvp] = await db.select().from(rsvps).where(and(eq(rsvps.postId, eventId), eq(rsvps.userId, userId))).limit(1);
    return rsvp || null;
  }

  async createRsvp(eventId: number, userId: number, status: string): Promise<void> {
    await db.insert(rsvps).values({
      postId: eventId,
      userId,
      status
    }).onConflictDoNothing();
  }

  async updateRsvp(eventId: number, userId: number, status: string): Promise<void> {
    await db
      .update(rsvps)
      .set({ status })
      .where(and(eq(rsvps.postId, eventId), eq(rsvps.userId, userId)));
  }

  async getRsvpStats(eventId: number): Promise<{ going: number; maybe: number; notGoing: number }> {
    const stats = await db
      .select({
        status: rsvps.status,
        count: count()
      })
      .from(rsvps)
      .where(eq(rsvps.postId, eventId))
      .groupBy(rsvps.status);

    const result = { going: 0, maybe: 0, notGoing: 0 };
    stats.forEach(stat => {
      if (stat.status === 'going') result.going = stat.count;
      else if (stat.status === 'maybe') result.maybe = stat.count;
      else if (stat.status === 'not_going') result.notGoing = stat.count;
    });

    return result;
  }

  async getRsvpList(eventId: number, status?: string): Promise<Array<{ user: User; status: string }>> {
    const conditions = [eq(rsvps.postId, eventId)];
    if (status) {
      conditions.push(eq(rsvps.status, status));
    }

    const result = await db
      .select({
        user: users,
        status: rsvps.status
      })
      .from(rsvps)
      .innerJoin(users, eq(rsvps.userId, users.id))
      .where(and(...conditions));

    return result.map(r => ({
      user: r.user,
      status: r.status
    }));
  }

  // NOTIFICATIONS
  async createNotification(notification: CreateNotificationData): Promise<Notification> {
    const [notif] = await db
      .insert(notifications)
      .values({
        userId: notification.userId,
        type: notification.type,
        postId: notification.postId || null,
        fromUserId: notification.fromUserId || null
      })
      .returning();
    return notif;
  }

  async getNotifications(userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        userId: notifications.userId,
        fromUserId: notifications.fromUserId,
        postId: notifications.postId,
        viewed: notifications.viewed,
        createdAt: notifications.createdAt,
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
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return result.map(r => ({
      id: r.id,
      type: r.type,
      userId: r.userId,
      fromUserId: r.fromUserId,
      postId: r.postId,
      viewed: r.viewed,
      createdAt: r.createdAt,
      fromUser: r.fromUser || undefined,
      post: r.post || undefined,
    }));
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ viewed: true })
      .where(eq(notifications.id, notificationId));
  }

  async markNotificationAsViewed(notificationId: number): Promise<void> {
    await this.markNotificationAsRead(notificationId);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.viewed, false)));
    return result.count;
  }

  // ADDITIONAL ENTERPRISE METHODS
  async getSharedWithMePosts(userId: number): Promise<PostWithUser[]> {
    return await this.getTaggedPosts(userId);
  }

  async markTaggedPostViewed(postId: number, userId: number): Promise<void> {
    // Mark tagged post as viewed - could be implemented with a separate table
    // For now, we'll use the post views system
    await this.recordPostView(postId, userId);
  }



  // ENERGY RATING SYSTEM IMPLEMENTATION
  
  async getPostEnergyStats(postId: number): Promise<{ average: number; count: number }> {
    const result = await db
      .select({
        average: avg(postEnergyRatings.rating),
        count: count(postEnergyRatings.id)
      })
      .from(postEnergyRatings)
      .where(eq(postEnergyRatings.postId, postId));

    const stats = result[0];
    return {
      average: stats.average ? Number(stats.average) : 4,
      count: stats.count || 0
    };
  }

  async getUserPostEnergyRating(postId: number, userId: number): Promise<number | null> {
    const [rating] = await db
      .select({ rating: postEnergyRatings.rating })
      .from(postEnergyRatings)
      .where(and(
        eq(postEnergyRatings.postId, postId),
        eq(postEnergyRatings.userId, userId)
      ));

    return rating?.rating || null;
  }

  async submitPostEnergyRating(postId: number, userId: number, rating: number): Promise<void> {
    // Check if rating exists
    const existingRating = await db
      .select()
      .from(postEnergyRatings)
      .where(and(
        eq(postEnergyRatings.postId, postId),
        eq(postEnergyRatings.userId, userId)
      ))
      .limit(1);

    if (existingRating.length > 0) {
      // Update existing rating
      await db
        .update(postEnergyRatings)
        .set({
          rating,
          updatedAt: new Date()
        })
        .where(and(
          eq(postEnergyRatings.postId, postId),
          eq(postEnergyRatings.userId, userId)
        ));
    } else {
      // Insert new rating
      await db
        .insert(postEnergyRatings)
        .values({
          postId,
          userId,
          rating,
          updatedAt: new Date()
        });
    }
  }

  async getProfileEnergyStats(profileId: number): Promise<{ average: number; count: number }> {
    const result = await db
      .select({
        average: avg(profileEnergyRatings.rating),
        count: count(profileEnergyRatings.id)
      })
      .from(profileEnergyRatings)
      .where(eq(profileEnergyRatings.profileId, profileId));

    const stats = result[0];
    return {
      average: stats.average ? Number(stats.average) : 4,
      count: stats.count || 0
    };
  }

  async getUserProfileEnergyRating(profileId: number, userId: number): Promise<number | null> {
    const [rating] = await db
      .select({ rating: profileEnergyRatings.rating })
      .from(profileEnergyRatings)
      .where(and(
        eq(profileEnergyRatings.profileId, profileId),
        eq(profileEnergyRatings.userId, userId)
      ));

    return rating?.rating || null;
  }

  async submitProfileEnergyRating(profileId: number, userId: number, rating: number): Promise<void> {
    await db
      .insert(profileEnergyRatings)
      .values({
        profileId,
        userId,
        rating,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [profileEnergyRatings.profileId, profileEnergyRatings.userId],
        set: {
          rating,
          updatedAt: new Date()
        }
      });
  }

  // Get attached lists for a post
  async getAttachedListsByPostId(postId: number): Promise<Array<{ id: number; name: string; userId: number; user?: { username: string } }>> {
    try {
      const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      if (!post.length || !post[0].attachedLists || post[0].attachedLists.length === 0) {
        return [];
      }
      
      // Fetch the attached lists with their creators
      const attachedLists = await db
        .select({
          id: lists.id,
          name: lists.name,
          userId: lists.userId,
          username: users.username
        })
        .from(lists)
        .innerJoin(users, eq(lists.userId, users.id))
        .where(inArray(lists.id, post[0].attachedLists));
      
      return attachedLists.map(list => ({
        id: list.id,
        name: list.name,
        userId: list.userId,
        user: { username: list.username }
      }));
    } catch (error) {
      console.error('Error fetching attached lists:', error);
      return [];
    }
  }
}

export const storage = new EnterpriseStorage();