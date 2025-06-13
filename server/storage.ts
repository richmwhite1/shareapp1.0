import { users, posts, comments, type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type PostWithUser, type CommentWithUser } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Post methods
  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  getPost(id: number): Promise<PostWithUser | undefined>;
  getAllPosts(): Promise<PostWithUser[]>;

  // Comment methods
  createComment(comment: InsertComment & { postId: number; userId: number }): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<CommentWithUser[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private currentUserId: number;
  private currentPostId: number;
  private currentCommentId: number;

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

export const storage = new MemStorage();
