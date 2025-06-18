import { adminUsers, adminSessions, auditLogs, moderationActions, systemConfig, bulkOperations, contentReviewQueue, 
         type AdminUser, type InsertAdminUser, type AuditLog, type InsertAuditLog, 
         type ModerationAction, type InsertModerationAction, type SystemConfig, type InsertSystemConfig,
         type BulkOperation, type ContentReviewItem } from "@shared/admin-schema";
import { users, posts, lists, postFlags, reports, type User, type Post, type List } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, like, count, gte, lt, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IAdminStorage {
  // Admin Authentication
  authenticateAdmin(username: string, password: string): Promise<AdminUser | null>;
  createAdminSession(adminId: number, ipAddress?: string, userAgent?: string): Promise<string>;
  validateAdminSession(token: string): Promise<AdminUser | null>;
  revokeAdminSession(token: string): Promise<void>;
  
  // Admin User Management
  createAdminUser(userData: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<void>;
  deleteAdminUser(id: number): Promise<void>;
  listAdminUsers(): Promise<AdminUser[]>;
  
  // Audit Logging
  logAdminAction(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { adminId?: number; action?: string; target?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;
  
  // Content Moderation
  addToReviewQueue(contentType: string, contentId: number, reason: string, priority?: string): Promise<ContentReviewItem>;
  getReviewQueue(filters?: { status?: string; assignedTo?: number; priority?: string }): Promise<ContentReviewItem[]>;
  assignReviewItem(itemId: number, adminId: number): Promise<void>;
  processReviewItem(itemId: number, action: string, reason: string, adminId: number): Promise<void>;
  
  // Moderation Actions
  createModerationAction(action: InsertModerationAction): Promise<ModerationAction>;
  getModerationHistory(contentType: string, contentId: number): Promise<ModerationAction[]>;
  getUserModerationHistory(userId: number): Promise<ModerationAction[]>;
  reverseModerationAction(actionId: number, adminId: number, reason: string): Promise<void>;
  
  // User Management
  banUser(userId: number, adminId: number, reason: string, duration?: Date): Promise<void>;
  unbanUser(userId: number, adminId: number, reason: string): Promise<void>;
  getUserFlags(userId: number): Promise<any[]>;
  searchUsers(query: string, filters?: { isActive?: boolean; isBanned?: boolean }): Promise<User[]>;
  
  // Content Management
  removeContent(contentType: string, contentId: number, adminId: number, reason: string): Promise<void>;
  restoreContent(contentType: string, contentId: number, adminId: number, reason: string): Promise<void>;
  getFlaggedContent(contentType?: string): Promise<any[]>;
  
  // System Configuration
  getSystemConfig(key?: string): Promise<SystemConfig[]>;
  updateSystemConfig(key: string, value: string, adminId: number): Promise<void>;
  
  // Analytics & Reports
  getDashboardMetrics(): Promise<{
    totalUsers: number;
    activeUsers24h: number;
    totalPosts: number;
    totalLists: number;
    flaggedContent: number;
    pendingReviews: number;
    systemHealth: string;
  }>;
  getUserGrowthStats(days: number): Promise<any[]>;
  getContentStats(days: number): Promise<any[]>;
  getModerationStats(days: number): Promise<any[]>;
  
  // Bulk Operations
  initiateBulkOperation(type: string, metadata: any, adminId: number): Promise<string>;
  updateBulkOperationProgress(operationId: string, progress: number, processedItems: number): Promise<void>;
  completeBulkOperation(operationId: string, errors?: string[]): Promise<void>;
  getBulkOperations(adminId?: number): Promise<BulkOperation[]>;
  
  // Data Export/Import
  exportUserData(filters?: any): Promise<any[]>;
  exportContentData(filters?: any): Promise<any[]>;
  importUsers(userData: any[], adminId: number): Promise<string>;
}

export class AdminStorage implements IAdminStorage {
  // Admin Authentication
  async authenticateAdmin(username: string, password: string): Promise<AdminUser | null> {
    const [admin] = await db.select().from(adminUsers).where(and(
      eq(adminUsers.username, username),
      eq(adminUsers.isActive, true)
    )).limit(1);

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return null;
    }

    // Update last login
    await db.update(adminUsers).set({ 
      lastLogin: new Date(),
      updatedAt: new Date()
    }).where(eq(adminUsers.id, admin.id));

    return admin;
  }

  async createAdminSession(adminId: number, ipAddress?: string, userAgent?: string): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(adminSessions).values({
      adminId,
      sessionToken,
      ipAddress,
      userAgent,
      expiresAt
    });

    return sessionToken;
  }

  async validateAdminSession(token: string): Promise<AdminUser | null> {
    const [session] = await db.select({
      admin: adminUsers,
      session: adminSessions
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
    .where(and(
      eq(adminSessions.sessionToken, token),
      gte(adminSessions.expiresAt, new Date()),
      eq(adminUsers.isActive, true)
    ))
    .limit(1);

    return session?.admin || null;
  }

  async revokeAdminSession(token: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.sessionToken, token));
  }

  // Admin User Management
  async createAdminUser(userData: InsertAdminUser): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [admin] = await db.insert(adminUsers).values({
      ...userData,
      password: hashedPassword
    }).returning();

    await this.logAdminAction({
      adminId: admin.id,
      action: 'admin_user_created',
      target: 'admin_user',
      targetId: admin.id,
      details: { username: admin.username, role: admin.role }
    });

    return admin;
  }

  async getAdminUser(id: number): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return admin;
  }

  async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<void> {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    await db.update(adminUsers).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(adminUsers.id, id));
  }

  async deleteAdminUser(id: number): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  async listAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }

  // Audit Logging
  async logAdminAction(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(filters?: { adminId?: number; action?: string; target?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    if (filters) {
      const conditions = [];
      if (filters.adminId) conditions.push(eq(auditLogs.adminId, filters.adminId));
      if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
      if (filters.target) conditions.push(eq(auditLogs.target, filters.target));
      if (filters.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
      if (filters.endDate) conditions.push(lt(auditLogs.createdAt, filters.endDate));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  // Content Moderation
  async addToReviewQueue(contentType: string, contentId: number, reason: string, priority: string = 'medium'): Promise<ContentReviewItem> {
    const [item] = await db.insert(contentReviewQueue).values({
      contentType,
      contentId,
      reason,
      priority
    }).returning();

    return item;
  }

  async getReviewQueue(filters?: { status?: string; assignedTo?: number; priority?: string }): Promise<ContentReviewItem[]> {
    let query = db.select().from(contentReviewQueue);
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(contentReviewQueue.status, filters.status));
      if (filters.assignedTo) conditions.push(eq(contentReviewQueue.assignedTo, filters.assignedTo));
      if (filters.priority) conditions.push(eq(contentReviewQueue.priority, filters.priority));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(contentReviewQueue.createdAt));
  }

  async assignReviewItem(itemId: number, adminId: number): Promise<void> {
    await db.update(contentReviewQueue).set({
      assignedTo: adminId,
      status: 'assigned'
    }).where(eq(contentReviewQueue.id, itemId));
  }

  async processReviewItem(itemId: number, action: string, reason: string, adminId: number): Promise<void> {
    const [item] = await db.select().from(contentReviewQueue).where(eq(contentReviewQueue.id, itemId)).limit(1);
    
    if (item) {
      // Create moderation action
      await this.createModerationAction({
        moderatorId: adminId,
        contentType: item.contentType,
        contentId: item.contentId,
        action,
        reason
      });

      // Update review queue item
      await db.update(contentReviewQueue).set({
        status: 'reviewed',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }).where(eq(contentReviewQueue.id, itemId));

      // Log the action
      await this.logAdminAction({
        adminId,
        action: 'content_reviewed',
        target: item.contentType,
        targetId: item.contentId,
        details: { action, reason, reviewItemId: itemId }
      });
    }
  }

  // Moderation Actions
  async createModerationAction(action: InsertModerationAction): Promise<ModerationAction> {
    const [moderationAction] = await db.insert(moderationActions).values(action).returning();
    return moderationAction;
  }

  async getModerationHistory(contentType: string, contentId: number): Promise<ModerationAction[]> {
    return await db.select().from(moderationActions)
      .where(and(
        eq(moderationActions.contentType, contentType),
        eq(moderationActions.contentId, contentId)
      ))
      .orderBy(desc(moderationActions.createdAt));
  }

  async getUserModerationHistory(userId: number): Promise<ModerationAction[]> {
    return await db.select().from(moderationActions)
      .where(and(
        eq(moderationActions.contentType, 'user'),
        eq(moderationActions.contentId, userId)
      ))
      .orderBy(desc(moderationActions.createdAt));
  }

  async reverseModerationAction(actionId: number, adminId: number, reason: string): Promise<void> {
    await db.update(moderationActions).set({
      status: 'reversed'
    }).where(eq(moderationActions.id, actionId));

    await this.logAdminAction({
      adminId,
      action: 'moderation_action_reversed',
      target: 'moderation_action',
      targetId: actionId,
      details: { reason }
    });
  }

  // User Management
  async banUser(userId: number, adminId: number, reason: string, duration?: Date): Promise<void> {
    await this.createModerationAction({
      moderatorId: adminId,
      contentType: 'user',
      contentId: userId,
      action: 'ban',
      reason,
      expiresAt: duration
    });

    await this.logAdminAction({
      adminId,
      action: 'user_banned',
      target: 'user',
      targetId: userId,
      details: { reason, duration: duration?.toISOString() }
    });
  }

  async unbanUser(userId: number, adminId: number, reason: string): Promise<void> {
    await this.createModerationAction({
      moderatorId: adminId,
      contentType: 'user',
      contentId: userId,
      action: 'unban',
      reason
    });

    await this.logAdminAction({
      adminId,
      action: 'user_unbanned',
      target: 'user',
      targetId: userId,
      details: { reason }
    });
  }

  async getUserFlags(userId: number): Promise<any[]> {
    return await db.select().from(postFlags).where(eq(postFlags.userId, userId));
  }

  async searchUsers(query: string, filters?: { isActive?: boolean; isBanned?: boolean }): Promise<User[]> {
    let dbQuery = db.select().from(users);
    
    const conditions = [
      or(
        like(users.username, `%${query}%`),
        like(users.name, `%${query}%`)
      )
    ];
    
    if (filters?.isActive !== undefined) {
      // Add user status filtering logic here if needed
    }
    
    return await dbQuery.where(and(...conditions)).orderBy(users.username);
  }

  // Content Management
  async removeContent(contentType: string, contentId: number, adminId: number, reason: string): Promise<void> {
    await this.createModerationAction({
      moderatorId: adminId,
      contentType,
      contentId,
      action: 'remove',
      reason
    });

    await this.logAdminAction({
      adminId,
      action: 'content_removed',
      target: contentType,
      targetId: contentId,
      details: { reason }
    });
  }

  async restoreContent(contentType: string, contentId: number, adminId: number, reason: string): Promise<void> {
    await this.createModerationAction({
      moderatorId: adminId,
      contentType,
      contentId,
      action: 'restore',
      reason
    });

    await this.logAdminAction({
      adminId,
      action: 'content_restored',
      target: contentType,
      targetId: contentId,
      details: { reason }
    });
  }

  async getFlaggedContent(contentType?: string): Promise<any[]> {
    let query = db.select().from(postFlags);
    
    if (contentType) {
      // Add content type filtering if needed
    }
    
    return await query.orderBy(desc(postFlags.createdAt));
  }

  // System Configuration
  async getSystemConfig(key?: string): Promise<SystemConfig[]> {
    let query = db.select().from(systemConfig);
    
    if (key) {
      query = query.where(eq(systemConfig.key, key));
    }
    
    return await query.orderBy(systemConfig.category, systemConfig.key);
  }

  async updateSystemConfig(key: string, value: string, adminId: number): Promise<void> {
    await db.insert(systemConfig).values({
      key,
      value,
      type: 'string',
      category: 'general',
      updatedBy: adminId
    }).onConflictDoUpdate({
      target: systemConfig.key,
      set: {
        value,
        updatedBy: adminId,
        updatedAt: new Date()
      }
    });

    await this.logAdminAction({
      adminId,
      action: 'system_config_updated',
      target: 'system_config',
      details: { key, value }
    });
  }

  // Analytics & Reports
  async getDashboardMetrics(): Promise<{
    totalUsers: number;
    activeUsers24h: number;
    totalPosts: number;
    totalLists: number;
    flaggedContent: number;
    pendingReviews: number;
    systemHealth: string;
  }> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [userStats] = await db.select({ count: count() }).from(users);
    const [activeUserStats] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, yesterday));
    const [postStats] = await db.select({ count: count() }).from(posts);
    const [listStats] = await db.select({ count: count() }).from(lists);
    const [flagStats] = await db.select({ count: count() }).from(postFlags);
    const [reviewStats] = await db.select({ count: count() }).from(contentReviewQueue).where(eq(contentReviewQueue.status, 'pending'));

    return {
      totalUsers: userStats.count,
      activeUsers24h: activeUserStats.count,
      totalPosts: postStats.count,
      totalLists: listStats.count,
      flaggedContent: flagStats.count,
      pendingReviews: reviewStats.count,
      systemHealth: 'excellent'
    };
  }

  async getUserGrowthStats(days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await db.select({
      date: sql`DATE(created_at)`,
      count: count()
    })
    .from(users)
    .where(gte(users.createdAt, startDate))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);
  }

  async getContentStats(days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await db.select({
      date: sql`DATE(created_at)`,
      posts: count(posts.id),
      lists: count(lists.id)
    })
    .from(posts)
    .leftJoin(lists, sql`DATE(${posts.createdAt}) = DATE(${lists.createdAt})`)
    .where(gte(posts.createdAt, startDate))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);
  }

  async getModerationStats(days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await db.select({
      date: sql`DATE(created_at)`,
      actions: count(),
      action_type: moderationActions.action
    })
    .from(moderationActions)
    .where(gte(moderationActions.createdAt, startDate))
    .groupBy(sql`DATE(created_at)`, moderationActions.action)
    .orderBy(sql`DATE(created_at)`);
  }

  // Bulk Operations
  async initiateBulkOperation(type: string, metadata: any, adminId: number): Promise<string> {
    const operationId = crypto.randomUUID();
    
    await db.insert(bulkOperations).values({
      operationId,
      type,
      metadata,
      initiatedBy: adminId
    });

    await this.logAdminAction({
      adminId,
      action: 'bulk_operation_initiated',
      target: 'bulk_operation',
      details: { operationId, type, metadata }
    });

    return operationId;
  }

  async updateBulkOperationProgress(operationId: string, progress: number, processedItems: number): Promise<void> {
    await db.update(bulkOperations).set({
      progress,
      processedItems,
      status: progress >= 100 ? 'completed' : 'processing'
    }).where(eq(bulkOperations.operationId, operationId));
  }

  async completeBulkOperation(operationId: string, errors?: string[]): Promise<void> {
    await db.update(bulkOperations).set({
      status: errors && errors.length > 0 ? 'failed' : 'completed',
      errors: errors || [],
      completedAt: new Date()
    }).where(eq(bulkOperations.operationId, operationId));
  }

  async getBulkOperations(adminId?: number): Promise<BulkOperation[]> {
    let query = db.select().from(bulkOperations);
    
    if (adminId) {
      query = query.where(eq(bulkOperations.initiatedBy, adminId));
    }
    
    return await query.orderBy(desc(bulkOperations.startedAt));
  }

  // Data Export/Import
  async exportUserData(filters?: any): Promise<any[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async exportContentData(filters?: any): Promise<any[]> {
    const postsData = await db.select().from(posts).orderBy(posts.id);
    const listsData = await db.select().from(lists).orderBy(lists.id);
    
    return {
      posts: postsData,
      lists: listsData
    } as any;
  }

  async importUsers(userData: any[], adminId: number): Promise<string> {
    const operationId = await this.initiateBulkOperation('user_import', { userCount: userData.length }, adminId);
    
    // Implementation would process the userData array
    // This is a placeholder for the actual import logic
    
    return operationId;
  }
}

export const adminStorage = new AdminStorage();