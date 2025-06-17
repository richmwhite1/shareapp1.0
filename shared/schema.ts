import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryId: integer("category_id").notNull().default(1), // Default to "General" category
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
  reminders: text("reminders").array(), // ["2_weeks", "1_week", "2_days", "1_day"]
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
  type: text("type").notNull(), // tag, friend_request, like, comment
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
  reminders: z.array(z.enum(["2_weeks", "1_week", "2_days", "1_day"])).optional(),
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
  categoryId: z.coerce.number().optional(),
  spotifyUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  hashtags: z.string().optional(),
  privacy: z.enum(["public", "friends", "private"]).default("public"),
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

// Category schemas
export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
  isPublic: true,
});

export const createCategorySchema = insertCategorySchema.extend({
  name: z.string().min(1).max(50, "Category name must be between 1 and 50 characters"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  isPublic: z.boolean().optional(),
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
  type: z.enum(["tag", "friend_request", "like", "comment"]),
  postId: z.number().optional(),
  fromUserId: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;

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
  category?: Pick<Category, 'id' | 'name'>;
  additionalPhotoData?: AdditionalPhotoData[];
  hashtags?: Hashtag[];
  taggedUsers?: Pick<User, 'id' | 'username' | 'name'>[];
};

export type CategoryWithPosts = Category & {
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

export type NotificationWithUser = Notification & {
  fromUser?: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  post?: Pick<Post, 'id' | 'primaryDescription'>;
};
