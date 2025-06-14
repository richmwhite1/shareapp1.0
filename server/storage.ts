import { users, posts, comments, categories, postLikes, postShares, type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type PostWithUser, type CommentWithUser, type Category, type InsertCategory, type CategoryWithPosts } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category methods
  createCategory(category: InsertCategory & { userId: number }): Promise<Category>;
  getCategoriesByUserId(userId: number): Promise<CategoryWithPosts[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryWithPosts(id: number): Promise<CategoryWithPosts | undefined>;

  // Post methods
  createPost(post: InsertPost & { userId: number; categoryId?: number }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(): Promise<PostWithUser[]>;
  getPostsByUserId(userId: number): Promise<PostWithUser[]>;
  getPostsByCategoryId(categoryId: number): Promise<PostWithUser[]>;

  // Comment methods
  createComment(comment: InsertComment & { postId: number; userId: number }): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;

  // Like methods
  likePost(postId: number, userId: number): Promise<void>;
  unlikePost(postId: number, userId: number): Promise<void>;
  getUserLike(postId: number, userId: number): Promise<boolean>;

  // Share methods
  sharePost(postId: number, userId?: number): Promise<void>;

  // Stats methods
  getPostStats(postId: number): Promise<{ likeCount: number; commentCount: number; shareCount: number }>;

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

  async createCategory(categoryData: InsertCategory & { userId: number }): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  async getCategoriesByUserId(userId: number): Promise<CategoryWithPosts[]> {
    const userCategories = await db.select().from(categories).where(eq(categories.userId, userId));
    
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

  async createPost(postData: InsertPost & { userId: number; categoryId?: number }): Promise<Post> {
    let categoryId = postData.categoryId;
    
    // If no category specified, find user's "General" category
    if (!categoryId) {
      const [generalCategory] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, postData.userId), eq(categories.name, 'General')));
      
      categoryId = generalCategory?.id || 1; // Fallback to global general if user's doesn't exist
    }
    
    const [post] = await db.insert(posts).values({ ...postData, categoryId }).returning();
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

  async createComment(commentData: InsertComment & { postId: number; userId: number }): Promise<Comment> {
    const [comment] = await db.insert(comments).values(commentData).returning();
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
      .orderBy(comments.createdAt);

    const commentsMap = new Map<number, CommentWithUser>();
    const topLevelComments: CommentWithUser[] = [];

    // First pass: create all comments
    for (const r of result) {
      const commentWithUser: CommentWithUser = {
        ...r.comment,
        user: r.user,
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
}

// Legacy MemStorage for reference - to be removed
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private categories: Map<number, Category>;
  private currentUserId: number;
  private currentPostId: number;
  private currentCommentId: number;
  private currentCategoryId: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.currentUserId = 1;
    this.currentPostId = 1;
    this.currentCommentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      profilePictureUrl: insertUser.profilePictureUrl || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async createPost(postData: InsertPost & { userId: number }): Promise<Post> {
    const id = this.currentPostId++;
    const post: Post = {
      ...postData,
      id,
      additionalPhotos: postData.additionalPhotos || null,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: number): Promise<PostWithUser | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const user = await this.getUser(post.userId);
    if (!user) return undefined;

    return {
      ...post,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
      },
    };
  }

  async getAllPosts(): Promise<PostWithUser[]> {
    const postsWithUsers: PostWithUser[] = [];
    
    for (const post of Array.from(this.posts.values())) {
      const user = await this.getUser(post.userId);
      if (user) {
        postsWithUsers.push({
          ...post,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            profilePictureUrl: user.profilePictureUrl,
          },
        });
      }
    }

    return postsWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createComment(commentData: InsertComment & { postId: number; userId: number }): Promise<Comment> {
    const id = this.currentCommentId++;
    const comment: Comment = {
      ...commentData,
      id,
      parentId: commentData.parentId || null,
      imageUrl: commentData.imageUrl || null,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    return comment;
  }

  async getCommentsByPostId(postId: number): Promise<CommentWithUser[]> {
    const postComments = Array.from(this.comments.values())
      .filter(comment => comment.postId === postId);

    const commentsWithUsers: CommentWithUser[] = [];

    for (const comment of postComments) {
      const user = await this.getUser(comment.userId);
      if (user) {
        commentsWithUsers.push({
          ...comment,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            profilePictureUrl: user.profilePictureUrl,
          },
        });
      }
    }

    // Build threaded structure
    const commentMap = new Map<number, CommentWithUser>();
    const rootComments: CommentWithUser[] = [];

    // First pass: create map and identify root comments
    commentsWithUsers.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
      if (!comment.parentId) {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    // Second pass: build the tree structure
    commentsWithUsers.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        const child = commentMap.get(comment.id);
        if (parent && child) {
          parent.replies = parent.replies || [];
          parent.replies.push(child);
        }
      }
    });

    // Sort by creation date
    const sortComments = (comments: CommentWithUser[]) => {
      comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      comments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          sortComments(comment.replies);
        }
      });
    };

    sortComments(rootComments);
    return rootComments;
  }
}

export const storage = new DatabaseStorage();
