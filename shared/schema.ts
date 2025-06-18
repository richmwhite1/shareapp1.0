import { pgTable, text, serial, integer, boolean, timestamp, json, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  defaultPrivacy: text("default_privacy").notNull().default("public"), // public, connections
  auraRating: text("aura_rating").default("4.00"), // User's average aura rating (1-7 scale)
  ratingCount: integer("rating_count").default(0), // Number of ratings received
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  privacyLevel: text("privacy_level").notNull().default("public"), // public, connections, private
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  listId: integer("list_id").notNull().default(1), // Default to "General" list
  primaryPhotoUrl: text("primary_photo_url").notNull(),
  primaryLink: text("primary_link").notNull(),
  primaryDescription: text("primary_description").notNull(),
  discountCode: text("discount_code"),
  additionalPhotos: text("additional_photos").array(),
  additionalPhotoData: json("additional_photo_data"), // Array of {url, link, description} objects
  spotifyUrl: text("spotify_url"),
  youtubeUrl: text("youtube_url"),
  mediaMetadata: json("media_metadata"), // Stores metadata from link previews
  privacy: text("privacy").notNull().default("public"), // public, friends, private
  engagement: integer("engagement").notNull().default(0),
  // Event functionality
  isEvent: boolean("is_event").notNull().default(false),
  eventDate: timestamp("event_date"),
  reminders: text("reminders").array(), // ["1_month", "2_weeks", "1_week", "3_days", "1_day"] - day_of is automatic
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringType: text("recurring_type"), // "weekly", "monthly", "annually"
  taskList: json("task_list"), // Array of {id, text, completed, completedBy: userId}
  allowRsvp: boolean("allow_rsvp").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"),
  text: text("text").notNull(),
  imageUrl: text("image_url"),
  rating: integer("rating"), // 1-5 star rating
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postShares = pgTable("post_shares", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id"),
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
});

// Energy/Aura rating system (1-7 chakra scale)
export const postEnergyRatings = pgTable("post_energy_ratings", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-7 (red to violet chakra)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profileEnergyRatings = pgTable("profile_energy_ratings", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-7 (red to violet chakra)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Friends system
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: integer("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("accepted"), // accepted, blocked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Hashtags
export const hashtags = pgTable("hashtags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  count: integer("count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postHashtags = pgTable("post_hashtags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  hashtagId: integer("hashtag_id").notNull(),
});

// Tagged users in posts
export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
});

// Comment tags
export const commentTags = pgTable("comment_tags", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  userId: integer("user_id").notNull(),
});

// Comment hashtags
export const commentHashtags = pgTable("comment_hashtags", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull(),
  hashtagId: integer("hashtag_id").notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // tag, friend_request, like, comment, share, friend_accept, list_invite, list_access_request, list_invitation, access_request, access_response
  postId: integer("post_id"),
  fromUserId: integer("from_user_id"),
  viewed: boolean("viewed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reports for admin
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Hashtag follows
export const hashtagFollows = pgTable("hashtag_follows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  hashtagId: integer("hashtag_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// RSVP responses for events
export const rsvps = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull(), // "going", "maybe", "not_going"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Blacklist for admin
export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // url, hashtag
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

// Post views tracking
export const postViews = pgTable("post_views", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id"), // null for anonymous views
  viewType: text("view_type").notNull(), // "feed", "expanded", "profile"
  viewDuration: integer("view_duration"), // milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Saved posts to user lists
export const savedPosts = pgTable("saved_posts", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  categoryId: integer("category_id").notNull(), // which list it's saved to
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User reposts
export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  originalPostId: integer("original_post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post flags for moderation
export const postFlags = pgTable("post_flags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason"), // optional reason for flagging
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tagged posts for "shared with you" feed
export const taggedPosts = pgTable("tagged_posts", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  fromUserId: integer("from_user_id").notNull(), // who tagged
  toUserId: integer("to_user_id").notNull(), // who was tagged
  isViewed: boolean("is_viewed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Task assignments for events
export const taskAssignments = pgTable("task_assignments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  taskId: text("task_id").notNull(),
  userId: integer("user_id").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

// List access control for private lists
export const listAccess = pgTable("list_access", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "collaborator" (edit), "viewer" (read-only)
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  invitedBy: integer("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Access requests for private lists
export const accessRequests = pgTable("access_requests", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedRole: text("requested_role").notNull(), // "collaborator" or "viewer"
  message: text("message"), // optional message from requester
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  profilePictureUrl: true,
});

export const signUpSchema = insertUserSchema.extend({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(50, "Name must be between 1 and 50 characters"),
});

export const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Post schemas
export const insertPostSchema = createInsertSchema(posts).pick({
  primaryPhotoUrl: true,
  primaryLink: true,
  primaryDescription: true,
  discountCode: true,
  additionalPhotos: true,
  additionalPhotoData: true,
  spotifyUrl: true,
  youtubeUrl: true,
  mediaMetadata: true,
  privacy: true,
  isEvent: true,
  eventDate: true,
  reminders: true,
  isRecurring: true,
  recurringType: true,
  taskList: true,
  allowRsvp: true,
});

export const createPostSchema = insertPostSchema.extend({
  primaryLink: z.string().url("Must be a valid URL"),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
  discountCode: z.string().optional(),
  additionalPhotos: z.array(z.string()).optional(),
  spotifyUrl: z.string().url("Must be a valid Spotify URL").optional().refine(
    (url) => !url || url.includes("spotify.com") || url.includes("open.spotify.com"),
    "Must be a valid Spotify URL"
  ),
  youtubeUrl: z.string().url("Must be a valid YouTube URL").optional().refine(
    (url) => !url || url.includes("youtube.com") || url.includes("youtu.be"),
    "Must be a valid YouTube URL"
  ),
  // Event fields
  isEvent: z.boolean().optional(),
  eventDate: z.string().optional(),
  reminders: z.array(z.enum(["1_month", "2_weeks", "1_week", "3_days", "1_day"])).optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(["weekly", "monthly", "annually"]).optional(),
  taskList: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean().default(false),
    completedBy: z.number().optional(),
  })).optional(),
  allowRsvp: z.boolean().optional(),
});

export const createPostRequestSchema = z.object({
  primaryLink: z.string().optional(),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
  discountCode: z.string().optional(),
  listId: z.coerce.number().optional(),
  spotifyUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  hashtags: z.string().optional(),
  privacy: z.enum(["public", "connections", "private"]).default("public"),
  taggedUsers: z.string().optional(), // JSON string of user IDs
  // Event fields
  isEvent: z.string().optional(), // "true" or "false" as string from form
  eventDate: z.string().optional(),
  reminders: z.string().optional(), // JSON string of reminder array
  isRecurring: z.string().optional(), // "true" or "false" as string from form
  recurringType: z.enum(["weekly", "monthly", "annually"]).optional(),
  taskList: z.string().optional(), // JSON string of task array
  allowRsvp: z.string().optional(), // "true" or "false" as string from form
}).refine(
  (data) => {
    // At least one of primaryLink, spotifyUrl, or youtubeUrl must be provided
    return data.primaryLink || data.spotifyUrl || data.youtubeUrl;
  },
  {
    message: "At least one URL (Primary Link, Spotify, or YouTube) is required",
    path: []
  }
).refine(
  (data) => {
    // Validate URLs if provided
    if (data.primaryLink && !z.string().url().safeParse(data.primaryLink).success) {
      return false;
    }
    if (data.spotifyUrl && (!z.string().url().safeParse(data.spotifyUrl).success || 
        !(data.spotifyUrl.includes("spotify.com") || data.spotifyUrl.includes("open.spotify.com")))) {
      return false;
    }
    if (data.youtubeUrl && (!z.string().url().safeParse(data.youtubeUrl).success || 
        !(data.youtubeUrl.includes("youtube.com") || data.youtubeUrl.includes("youtu.be")))) {
      return false;
    }
    return true;
  },
  {
    message: "Invalid URL format",
    path: ["primaryLink"]
  }
);

// List schemas
export const insertListSchema = createInsertSchema(lists).pick({
  name: true,
  description: true,
  isPublic: true,
  privacyLevel: true,
});

export const createListSchema = insertListSchema.extend({
  name: z.string().min(1).max(50, "List name must be between 1 and 50 characters"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  isPublic: z.boolean().optional(),
  privacyLevel: z.enum(["public", "connections", "private"]).default("public"),
});

// List access schemas
export const createListAccessSchema = z.object({
  listId: z.number(),
  userId: z.number(),
  role: z.enum(["collaborator", "viewer"]),
});

export const respondListAccessSchema = z.object({
  accessId: z.number(),
  action: z.enum(["accept", "reject"]),
});

export const createAccessRequestSchema = z.object({
  listId: z.number(),
  requestedRole: z.enum(["collaborator", "viewer"]),
  message: z.string().max(500).optional(),
});

// Comment schemas
export const insertCommentSchema = createInsertSchema(comments).pick({
  text: true,
  imageUrl: true,
  parentId: true,
  rating: true,
});

export const createCommentSchema = insertCommentSchema.extend({
  text: z.string().min(1).max(1000, "Comment must be between 1 and 1000 characters"),
  parentId: z.number().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  hashtags: z.array(z.string()).optional(),
  taggedFriends: z.array(z.number()).optional(),
});

// Friendship schemas
export const createFriendshipSchema = z.object({
  friendId: z.number(),
});

export const createFriendRequestSchema = z.object({
  toUserId: z.number(),
});

export const respondFriendRequestSchema = z.object({
  requestId: z.number(),
  action: z.enum(["accept", "reject"]),
});

// Hashtag schemas
export const createHashtagSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, "Hashtag must be alphanumeric with underscores"),
});

// Report schemas
export const createReportSchema = z.object({
  postId: z.number(),
  reason: z.string().min(1).max(100),
  comment: z.string().max(500).optional(),
});

// RSVP schemas
export const createRsvpSchema = z.object({
  postId: z.number(),
  status: z.enum(["going", "maybe", "not_going"]),
});

// Notification schemas
export const createNotificationSchema = z.object({
  userId: z.number(),
  type: z.enum(["tag", "friend_request", "like", "comment", "share", "friend_accept", "list_invite", "list_access_request"]),
  postId: z.number().optional(),
  fromUserId: z.number().optional(),
  categoryId: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;

export type InsertList = z.infer<typeof insertListSchema>;
export type List = typeof lists.$inferSelect;
export type CreateListData = z.infer<typeof createListSchema>;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type CreatePostData = z.infer<typeof createPostSchema>;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type CreateCommentData = z.infer<typeof createCommentSchema>;

// New types for enhanced features
export type Friendship = typeof friendships.$inferSelect;
export type CreateFriendshipData = z.infer<typeof createFriendshipSchema>;

export type FriendRequest = typeof friendRequests.$inferSelect;
export type CreateFriendRequestData = z.infer<typeof createFriendRequestSchema>;
export type RespondFriendRequestData = z.infer<typeof respondFriendRequestSchema>;

export type Hashtag = typeof hashtags.$inferSelect;
export type CreateHashtagData = z.infer<typeof createHashtagSchema>;

export type PostTag = typeof postTags.$inferSelect;
export type CommentTag = typeof commentTags.$inferSelect;
export type PostHashtag = typeof postHashtags.$inferSelect;
export type CommentHashtag = typeof commentHashtags.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
export type CreateNotificationData = z.infer<typeof createNotificationSchema>;

export type Report = typeof reports.$inferSelect;
export type CreateReportData = z.infer<typeof createReportSchema>;

export type HashtagFollow = typeof hashtagFollows.$inferSelect;

export type BlacklistItem = typeof blacklist.$inferSelect;

export type Rsvp = typeof rsvps.$inferSelect;
export type CreateRsvpData = z.infer<typeof createRsvpSchema>;

// Additional photo data type
export type AdditionalPhotoData = {
  url: string;
  link: string;
  description: string;
  discountCode: string;
};

// Extended types for API responses
export type PostWithUser = Post & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  list?: Pick<List, 'id' | 'name'>;
  additionalPhotoData?: AdditionalPhotoData[];
  hashtags?: Hashtag[];
  taggedUsers?: Pick<User, 'id' | 'username' | 'name'>[];
};

export type ListWithPosts = List & {
  posts: PostWithUser[];
  postCount: number;
  firstPostImage?: string;
};

export type CommentWithUser = Comment & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  replies?: CommentWithUser[];
  hashtags?: Hashtag[];
  taggedUsers?: Pick<User, 'id' | 'username' | 'name'>[];
};

export type UserWithFriends = User & {
  friends: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>[];
  friendCount: number;
  hasNewPosts?: boolean;
};

// New types for view tracking and post interactions
export type PostView = typeof postViews.$inferSelect;
export type SavedPost = typeof savedPosts.$inferSelect;
export type Repost = typeof reposts.$inferSelect;
export type PostFlag = typeof postFlags.$inferSelect;
export type TaggedPost = typeof taggedPosts.$inferSelect;

// Extended post type with view count and repost info
export type PostWithStats = PostWithUser & {
  viewCount: number;
  isRepost?: boolean;
  originalPost?: PostWithUser;
  repostUser?: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
};

export type NotificationWithUser = Notification & {
  fromUser?: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  post?: Pick<Post, 'id' | 'primaryDescription'>;
};

// Admin types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = typeof adminSessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type ModerationAction = typeof moderationActions.$inferSelect;
export type InsertModerationAction = typeof moderationActions.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;
export type BulkOperation = typeof bulkOperations.$inferSelect;
export type InsertBulkOperation = typeof bulkOperations.$inferInsert;
export type ContentReviewItem = typeof contentReviewQueue.$inferSelect;
export type InsertContentReviewItem = typeof contentReviewQueue.$inferInsert;
