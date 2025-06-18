import { users, type User, type InsertUser, type UserWithFriends, posts, type Post, type PostWithUser, type InsertPost, 
  lists, type List, type ListWithPosts, type InsertList, listAccess, friendships, notifications, type Notification, type CreateNotificationData } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, like, exists, not, inArray, count, avg } from 'drizzle-orm';

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
  
  // Post methods
  createPost(post: InsertPost & { userId: number; listId?: number }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(viewerId?: number): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByListId(listId: number): Promise<PostWithUser[]>;

  // Post stats and interactions
  getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }>;
  isPostLiked(postId: number, userId: number): Promise<boolean>;
  getPostViewCount(postId: number): Promise<number>;
  recordPostView(postId: number, userId?: number): Promise<void>;

  // User energy ratings
  getUserEnergyStats(userId: number): Promise<{ average: number; count: number }>;

  // Friends system
  getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>>;

  // Notification methods
  createNotification(notification: CreateNotificationData): Promise<Notification>;
  getNotifications(userId: number): Promise<any[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;
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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserWithFriends(id: number): Promise<UserWithFriends | undefined> {
    // Basic implementation
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    return {
      ...user,
      friends: [],
      friendCount: 0,
      relationshipStatus: 'none'
    } as UserWithFriends;
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          like(users.username, `%${query}%`),
          like(users.name, `%${query}%`)
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
    const result = await db
      .select({
        list: lists,
        posts: posts
      })
      .from(lists)
      .leftJoin(posts, eq(lists.id, posts.listId))
      .where(eq(lists.userId, userId))
      .orderBy(desc(lists.createdAt));

    const listsMap = new Map<number, ListWithPosts>();
    
    for (const row of result) {
      if (!listsMap.has(row.list.id)) {
        listsMap.set(row.list.id, {
          ...row.list,
          posts: []
        });
      }
      
      if (row.posts) {
        listsMap.get(row.list.id)!.posts.push(row.posts);
      }
    }

    return Array.from(listsMap.values());
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
      posts: listPosts.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
        userId: p.userId,
        listId: p.listId
      }))
    };
  }

  async getListsWithAccess(viewerId?: number): Promise<ListWithPosts[]> {
    // Simplified implementation
    if (!viewerId) return [];
    
    return this.getListsByUserId(viewerId);
  }

  async updateListPrivacy(listId: number, privacyLevel: string): Promise<void> {
    await db
      .update(lists)
      .set({ privacyLevel })
      .where(eq(lists.id, listId));
  }

  async deleteList(listId: number): Promise<void> {
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
          invitedBy
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
    const [inviter] = await db.select().from(users).where(eq(users.id, invitedBy)).limit(1);
    if (list && inviter) {
      await this.createNotification({
        userId,
        type: 'list_invite',
        postId: listId // Use postId to store listId for compatibility
      });
    }
  }

  async respondToListInvite(accessId: number, action: string): Promise<void> {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await db
      .update(listAccess)
      .set({ status })
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
    // Check if user is the list owner
    const [list] = await db.select().from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1);
    if (list) return { hasAccess: true, role: 'owner' };

    // Check if user has been granted access as collaborator or viewer
    const [access] = await db.select().from(listAccess).where(and(eq(listAccess.listId, listId), eq(listAccess.userId, userId), eq(listAccess.status, 'accepted'))).limit(1);
    if (access) return { hasAccess: true, role: access.role };
    
    return { hasAccess: false };
  }

  async removeListAccess(listId: number, userId: number): Promise<void> {
    await db.delete(listAccess).where(and(eq(listAccess.listId, listId), eq(listAccess.userId, userId)));
  }

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

  async createPost(postData: InsertPost & { userId: number; listId?: number }): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        title: postData.title,
        content: postData.content,
        imageUrl: postData.imageUrl,
        userId: postData.userId,
        listId: postData.listId
      })
      .returning();

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

    const row = result[0];
    return {
      ...row.post,
      user: row.user!,
      list: row.list || undefined
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

    const allPosts = result.map(r => ({
      ...r.post,
      user: r.user!,
      list: r.list || undefined
    })) as PostWithUser[];

    // Filter posts based on list privacy settings
    if (!viewerId) {
      // Anonymous users can only see posts in public lists or posts without lists
      return allPosts.filter(post => !post.list || (post.list && post.list.privacyLevel === 'public'));
    }

    const filteredPosts = [];
    for (const post of allPosts) {
      // Always show user's own posts
      if (post.userId === viewerId) {
        filteredPosts.push(post);
        continue;
      }

      // If post has no list, show it (legacy support)
      if (!post.list) {
        filteredPosts.push(post);
        continue;
      }

      const listPrivacy = post.list.privacyLevel;

      if (listPrivacy === 'public') {
        filteredPosts.push(post);
      } else if (listPrivacy === 'connections') {
        // Check if viewer is connected to post author
        const areFriends = await this.areFriends(viewerId, post.userId);
        if (areFriends) {
          filteredPosts.push(post);
        }
      } else if (listPrivacy === 'private') {
        // Check if viewer has access to this private list
        const { hasAccess } = await this.hasListAccess(viewerId, post.list.id);
        if (hasAccess) {
          filteredPosts.push(post);
        }
      }
    }

    return filteredPosts;
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

  async createNotification(notification: CreateNotificationData): Promise<Notification> {
    const [notif] = await db
      .insert(notifications)
      .values({
        userId: notification.userId,
        type: notification.type,
        postId: notification.postId,
        fromUserId: notification.fromUserId
      })
      .returning();
    return notif;
  }

  async getNotifications(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    
    return result[0]?.count || 0;
  }

  // Stub implementations for missing methods to prevent errors
  async getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number; viewCount: number }> {
    return { likeCount: 0, commentCount: 0, shareCount: 0, viewCount: 0 };
  }

  async isPostLiked(postId: number, userId: number): Promise<boolean> {
    return false;
  }

  async getPostViewCount(postId: number): Promise<number> {
    return 0;
  }

  async recordPostView(postId: number, userId?: number): Promise<void> {
    // Stub implementation
  }

  async getUserEnergyStats(userId: number): Promise<{ average: number; count: number }> {
    return { average: 4, count: 0 };
  }

  async getFriendsWithRecentPosts(userId: number): Promise<Array<{ user: User; hasRecentPosts: boolean }>> {
    return [];
  }
}

export const storage = new DatabaseStorage();