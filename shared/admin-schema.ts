import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("moderator"), // super_admin, moderator, content_admin
  permissions: text("permissions").array().notNull().default([]), // ['user_management', 'content_moderation', 'system_config']
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Admin sessions for authentication
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs for admin actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => adminUsers.id),
  action: text("action").notNull(), // 'user_ban', 'content_remove', 'config_update', etc.
  target: text("target").notNull(), // 'user', 'post', 'list', 'system'
  targetId: integer("target_id"), // ID of the affected entity
  details: json("details"), // Additional context about the action
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Moderation actions
export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  moderatorId: integer("moderator_id").notNull().references(() => adminUsers.id),
  contentType: text("content_type").notNull(), // 'post', 'user', 'comment', 'list'
  contentId: integer("content_id").notNull(),
  action: text("action").notNull(), // 'approve', 'reject', 'flag', 'ban', 'warn'
  reason: text("reason").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // 'active', 'reversed', 'expired'
  expiresAt: timestamp("expires_at"), // For temporary actions like temporary bans
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// System configuration
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").notNull(), // 'string', 'number', 'boolean', 'json'
  description: text("description"),
  category: text("category").notNull(), // 'privacy', 'limits', 'features', 'maintenance'
  updatedBy: integer("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Bulk operations tracking
export const bulkOperations = pgTable("bulk_operations", {
  id: serial("id").primaryKey(),
  operationId: text("operation_id").notNull().unique(),
  type: text("type").notNull(), // 'user_import', 'content_migration', 'data_cleanup'
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").notNull().default(0), // Percentage
  totalItems: integer("total_items").notNull().default(0),
  processedItems: integer("processed_items").notNull().default(0),
  errors: json("errors").notNull().default([]),
  metadata: json("metadata"), // Operation-specific data
  initiatedBy: integer("initiated_by").notNull().references(() => adminUsers.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Content review queue
export const contentReviewQueue = pgTable("content_review_queue", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // 'post', 'comment', 'list'
  contentId: integer("content_id").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  reason: text("reason").notNull(), // Why it's in review queue
  flagCount: integer("flag_count").notNull().default(1),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'escalated'
  assignedTo: integer("assigned_to").references(() => adminUsers.id),
  reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertAdminUser = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLog = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertModerationAction = createInsertSchema(moderationActions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemConfig = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

// Types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUser>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLog>;
export type ModerationAction = typeof moderationActions.$inferSelect;
export type InsertModerationAction = z.infer<typeof insertModerationAction>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfig>;
export type BulkOperation = typeof bulkOperations.$inferSelect;
export type ContentReviewItem = typeof contentReviewQueue.$inferSelect;