import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  primaryPhotoUrl: text("primary_photo_url").notNull(),
  primaryLink: text("primary_link").notNull(),
  primaryDescription: text("primary_description").notNull(),
  additionalPhotos: text("additional_photos").array(),
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
  additionalPhotos: true,
});

export const createPostSchema = insertPostSchema.extend({
  primaryLink: z.string().url("Must be a valid URL"),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
  additionalPhotos: z.array(z.string()).optional(),
});

export const createPostRequestSchema = z.object({
  primaryLink: z.string().url("Must be a valid URL"),
  primaryDescription: z.string().min(1).max(500, "Description must be between 1 and 500 characters"),
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
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type CreatePostData = z.infer<typeof createPostSchema>;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type CreateCommentData = z.infer<typeof createCommentSchema>;

// Extended types for API responses
export type PostWithUser = Post & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
};

export type CommentWithUser = Comment & {
  user: Pick<User, 'id' | 'username' | 'name' | 'profilePictureUrl'>;
  replies?: CommentWithUser[];
};
