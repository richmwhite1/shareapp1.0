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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"),
  text: text("text").notNull(),
  imageUrl: text("image_url"),
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
});

export const createPostSchema = insertPostSchema.extend({
  primaryLink: z.string().url("Must be a valid URL"),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
  additionalPhotos: z.array(z.string()).optional(),
});

export const createPostRequestSchema = z.object({
  primaryLink: z.string().url("Must be a valid URL"),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
  categoryId: z.coerce.number().optional(),
});

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
});

export const createCommentSchema = insertCommentSchema.extend({
  text: z.string().min(1).max(1000, "Comment must be between 1 and 1000 characters"),
  parentId: z.number().optional(),
  imageUrl: z.string().optional(),
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

// Additional photo data type
export type AdditionalPhotoData = {
  url: string;
  link: string;
  description: string;
};

// Extended types for API responses
export type PostWithUser = Post & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  category?: Pick<Category, 'id' | 'name'>;
  additionalPhotoData?: AdditionalPhotoData[];
};

export type CategoryWithPosts = Category & {
  posts: PostWithUser[];
  postCount: number;
  firstPostImage?: string;
};

export type CommentWithUser = Comment & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  replies?: CommentWithUser[];
};
