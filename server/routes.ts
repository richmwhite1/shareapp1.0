import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  signUpSchema, signInSchema, createPostSchema, createPostRequestSchema, createCommentSchema, createCategorySchema, 
  createFriendshipSchema, createHashtagSchema, createReportSchema, createNotificationSchema,
  type AdditionalPhotoData, users
} from "@shared/schema";
import { db } from "./db";
import { or, like, sql } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow placeholder files (empty files for "Add by Link" functionality)
    if (file.size === 0 && file.originalname === 'placeholder.jpg') {
      return cb(null, true);
    }
    
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to save uploaded file
const saveUploadedFile = (file: Express.Multer.File): string => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
  const filepath = path.join(uploadsDir, filename);
  
  fs.writeFileSync(filepath, fs.readFileSync(file.path));
  fs.unlinkSync(file.path); // Remove temporary file
  
  return `/uploads/${filename}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Auth routes
  app.post('/api/auth/signup', upload.single('profilePicture'), async (req, res) => {
    try {
      const { username, password, name } = signUpSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Handle profile picture upload
      let profilePictureUrl = null;
      if (req.file) {
        profilePictureUrl = saveUploadedFile(req.file);
      }

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        profilePictureUrl,
      });

      // Create default "General" category for the new user
      await storage.createCategory({
        userId: user.id,
        name: 'General',
        description: 'Default category for all posts',
        isPublic: false,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          profilePictureUrl: user.profilePictureUrl,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { username, password } = signInSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          profilePictureUrl: user.profilePictureUrl,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/auth/verify', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          profilePictureUrl: user.profilePictureUrl,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Post routes
  app.post('/api/posts', authenticateToken, upload.fields([
    { name: 'primaryPhoto', maxCount: 1 },
    { name: 'additionalPhotos', maxCount: 4 }
  ]), async (req: any, res) => {
    try {
      let primaryPhotoUrl = '';
      
      // Handle primary photo upload (optional if media URLs are provided)
      if (req.files && req.files['primaryPhoto'] && req.files['primaryPhoto'][0]) {
        const primaryPhotoFile = req.files['primaryPhoto'][0];
        primaryPhotoUrl = saveUploadedFile(primaryPhotoFile);
      }

      // Parse and validate the request body
      const bodyData = {
        primaryLink: req.body.primaryLink,
        primaryDescription: req.body.primaryDescription,
        discountCode: req.body.discountCode || undefined,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : 1,
        spotifyUrl: req.body.spotifyUrl || undefined,
        youtubeUrl: req.body.youtubeUrl || undefined,
        hashtags: req.body.hashtags || undefined,
        privacy: req.body.privacy || 'public',
        taggedUsers: req.body.taggedUsers || undefined
      };
      
      let validatedData;
      try {
        validatedData = createPostRequestSchema.parse(bodyData);
      } catch (error: any) {
        if (error.errors && error.errors.length > 0) {
          const firstError = error.errors[0];
          return res.status(400).json({ 
            message: firstError.message || "Validation failed",
            errors: error.errors 
          });
        }
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      const { primaryLink, primaryDescription, discountCode, categoryId, spotifyUrl, youtubeUrl, hashtags, privacy, taggedUsers } = validatedData;
      
      // Parse hashtags from the hashtags string
      const parseHashtags = (input: string): string[] => {
        if (!input) return [];
        const tags = input
          .match(/#[a-zA-Z0-9_]+/g)
          ?.map((tag) => tag.substring(1).toLowerCase())
          .slice(0, 10) || [];
        // Remove duplicates manually
        const uniqueTags: string[] = [];
        for (const tag of tags) {
          if (!uniqueTags.includes(tag)) {
            uniqueTags.push(tag);
          }
        }
        return uniqueTags;
      };
      
      const hashtagArray = parseHashtags(hashtags || '');

      // Auto-fetch image from media URLs if no primary photo uploaded
      if (!primaryPhotoUrl && (spotifyUrl || youtubeUrl)) {
        try {
          let imageUrl = '';
          
          if (youtubeUrl) {
            // Extract YouTube video ID from various formats including Shorts
            const videoMatch = youtubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (videoMatch) {
              const videoId = videoMatch[1];
              // Try different thumbnail qualities until one works
              const thumbnailUrls = [
                `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/default.jpg`
              ];
              
              for (const thumbnailUrl of thumbnailUrls) {
                try {
                  const testResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
                  if (testResponse.ok) {
                    imageUrl = thumbnailUrl;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
            }
          } else if (spotifyUrl) {
            // Extract album artwork from Spotify web page
            try {
              const { load } = await import('cheerio');
              const spotifyResponse = await fetch(spotifyUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
              });
              
              if (spotifyResponse.ok) {
                const html = await spotifyResponse.text();
                const $ = load(html);
                
                // Try multiple selectors for Spotify album artwork
                const possibleSelectors = [
                  'meta[property="og:image"]',
                  'meta[name="twitter:image"]',
                  'img[data-testid="cover-art"]',
                  'img[alt*="Cover"]',
                  '.cover-art img',
                  '.track-info img'
                ];
                
                for (const selector of possibleSelectors) {
                  const imageElement = $(selector);
                  if (imageElement.length) {
                    const src = imageElement.attr('content') || imageElement.attr('src');
                    if (src && src.includes('scdn.co')) {
                      imageUrl = src;
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.log('Spotify scraping failed:', error);
            }
            
            // Fallback to Spotify logo if scraping fails
            if (!imageUrl) {
              imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/512px-Spotify_logo_without_text.svg.png';
            }
          }
          
          if (imageUrl) {
            // Fetch and save the image
            const response = await fetch(imageUrl);
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const blob = new Blob([buffer]);
              const file = new File([blob], 'media-thumbnail.jpg', { type: 'image/jpeg' });
              
              // Save the file using the same logic as uploaded files
              const timestamp = Date.now();
              const filename = `${timestamp}-media-thumbnail.jpg`;
              const fs = await import('fs');
              const path = await import('path');
              const uploadsDir = path.join(process.cwd(), 'uploads');
              
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              const filepath = path.join(uploadsDir, filename);
              fs.writeFileSync(filepath, Buffer.from(buffer));
              primaryPhotoUrl = `/uploads/${filename}`;
            }
          }
        } catch (error) {
          console.error('Failed to fetch media thumbnail:', error);
        }
      }

      // For posts with only media URLs but no successful thumbnail fetch, create a default placeholder
      if (!primaryPhotoUrl && (spotifyUrl || youtubeUrl)) {
        // Create a simple colored placeholder image
        const fs = await import('fs');
        const path = await import('path');
        
        // Create a simple 1x1 pixel image as fallback
        const timestamp = Date.now();
        const filename = `${timestamp}-placeholder.jpg`;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Create a minimal JPEG file (1x1 pixel black image)
        const minimalJpeg = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
          0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
          0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
          0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
          0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
          0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
          0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
          0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
          0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
          0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
          0xFF, 0xD9
        ]);
        
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, minimalJpeg);
        primaryPhotoUrl = `/uploads/${filename}`;
      }
      
      // Ensure we have a primary photo for regular link posts
      if (!primaryPhotoUrl && !spotifyUrl && !youtubeUrl) {
        return res.status(400).json({ message: 'Primary photo is required for regular link posts' });
      }

      // Handle additional photos with enhanced data
      const additionalPhotos: string[] = [];
      const additionalPhotoData: { url: string; link: string; description: string; discountCode: string }[] = [];
      
      if (req.files['additionalPhotos']) {
        for (let i = 0; i < req.files['additionalPhotos'].length; i++) {
          const file = req.files['additionalPhotos'][i];
          
          // Get corresponding link, description, and discount code from form data
          const link = req.body[`additionalPhotoLink_${i}`] || '';
          const description = req.body[`additionalPhotoDescription_${i}`] || '';
          const discountCode = req.body[`additionalPhotoDiscountCode_${i}`] || '';
          
          // Handle placeholder files (when image fetch fails)
          let photoUrl = '';
          if (file.size === 0 && file.originalname === 'placeholder.jpg') {
            // Create a placeholder image URL or use a default
            photoUrl = '/placeholder-image.svg';
          } else {
            photoUrl = saveUploadedFile(file);
          }
          
          additionalPhotos.push(photoUrl);
          additionalPhotoData.push({
            url: photoUrl,
            link,
            description,
            discountCode: discountCode || ''
          });
        }
      }

      // Fetch metadata for Spotify and YouTube URLs
      let mediaMetadata: Record<string, any> | null = null;
      if (spotifyUrl || youtubeUrl) {
        const { getLinkPreview } = await import('link-preview-js');
        mediaMetadata = {} as Record<string, any>;
        
        if (spotifyUrl) {
          try {
            (mediaMetadata as any).spotify = await getLinkPreview(spotifyUrl);
          } catch (error) {
            console.error('Failed to fetch Spotify metadata:', error);
            (mediaMetadata as any).spotify = null;
          }
        }
        
        if (youtubeUrl) {
          try {
            (mediaMetadata as any).youtube = await getLinkPreview(youtubeUrl);
          } catch (error) {
            console.error('Failed to fetch YouTube metadata:', error);
            (mediaMetadata as any).youtube = null;
          }
        }
      }

      // Parse tagged users from JSON string
      let taggedUsersArray: number[] = [];
      if (taggedUsers) {
        try {
          taggedUsersArray = JSON.parse(taggedUsers);
        } catch (error) {
          console.error('Failed to parse taggedUsers:', error);
        }
      }

      // Create post
      const post = await storage.createPost({
        userId: req.user.userId,
        primaryPhotoUrl: primaryPhotoUrl || '/placeholder-image.svg',
        primaryLink: primaryLink || '',
        primaryDescription,
        discountCode,
        additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : null,
        additionalPhotoData: additionalPhotoData.length > 0 ? additionalPhotoData : null,
        categoryId: categoryId || undefined, // Let storage handle default category
        spotifyUrl,
        youtubeUrl,
        mediaMetadata,
        hashtags: hashtagArray,
        privacy,
        taggedUsers: taggedUsersArray
      });

      // Get post with user data
      const postWithUser = await storage.getPost(post.id);
      res.json(postWithUser);
    } catch (error: any) {
      console.error('Post creation error:', error);
      if (error.name === 'ZodError') {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: error.errors[0].message, field: error.errors[0].path[0] });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Category routes
  app.get('/api/categories', authenticateToken, async (req: any, res) => {
    try {
      const categories = await storage.getCategoriesByUserId(req.user.userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/categories', authenticateToken, async (req: any, res) => {
    try {
      const categoryData = createCategorySchema.parse(req.body);
      const category = await storage.createCategory({
        ...categoryData,
        userId: req.user.userId,
      });
      res.json(category);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategoryWithPosts(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get categories by user ID (public categories only for unauthenticated users)
  app.get('/api/categories/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const categories = await storage.getCategoriesByUserId(userId);
      
      // Filter only public categories for unauthenticated requests
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) {
        const publicCategories = categories.filter(cat => cat.isPublic);
        return res.json(publicCategories);
      }

      // For authenticated users viewing their own profile, return all categories
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.userId === userId) {
          return res.json(categories);
        } else {
          // Authenticated user viewing another's profile - show only public categories
          const publicCategories = categories.filter(cat => cat.isPublic);
          return res.json(publicCategories);
        }
      } catch {
        // Invalid token - show only public categories
        const publicCategories = categories.filter(cat => cat.isPublic);
        return res.json(publicCategories);
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts', async (req, res) => {
    try {
      // Extract user ID from token if present
      let viewerId: number | undefined;
      const token = req.headers['authorization']?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          viewerId = decoded.userId;
        } catch (error) {
          // Invalid token, proceed as anonymous user
        }
      }

      const posts = await storage.getAllPosts(viewerId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/category/:categoryId', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }

      const posts = await storage.getPostsByCategoryId(categoryId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user's posts
  app.get('/api/posts/user', authenticateToken, async (req: any, res) => {
    try {
      const posts = await storage.getPostsByUserId(req.user.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const posts = await storage.getPostsByUserId(userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Comment routes
  app.post('/api/posts/:postId/comments', authenticateToken, upload.single('image'), async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      // Parse parentId separately to handle form data properly
      const parentId = req.body.parentId ? parseInt(req.body.parentId) : undefined;
      
      // Validate only the text field since imageUrl is handled separately
      const validationData = {
        text: req.body.text,
        ...(parentId && { parentId }),
      };
      
      const { text } = createCommentSchema.parse(validationData);

      // Verify post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Handle image upload
      let imageUrl = null;
      if (req.file) {
        imageUrl = saveUploadedFile(req.file);
      }

      // Create comment
      const comment = await storage.createComment({
        postId,
        userId: req.user.userId,
        text,
        parentId,
        imageUrl,
      });

      // Get comment with user data
      const user = await storage.getUser(req.user.userId);
      const commentWithUser = {
        ...comment,
        user: {
          id: user!.id,
          username: user!.username,
          name: user!.name,
          profilePictureUrl: user!.profilePictureUrl,
        },
      };

      res.json(commentWithUser);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const comments = await storage.getCommentsByPostId(postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Social feature routes
  app.get('/api/posts/:id/stats', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const stats = await storage.getPostStats(postId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const hasLiked = await storage.getUserLike(postId, req.user.userId);
      res.json(hasLiked);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.likePost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.unlikePost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/share', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.sharePost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/user/total-shares/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const totalShares = await storage.getUserTotalShares(userId);
      res.json(totalShares);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Image scraping endpoint
  app.post('/api/scrape-image', authenticateToken, async (req: any, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      const fetch = (await import('node-fetch')).default;
      
      // Check if this is a direct image URL (like YouTube thumbnails)
      const isDirectImageUrl = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                               url.includes('img.youtube.com') ||
                               url.includes('i.scdn.co');
      
      // Check if this is a Spotify URL that needs special handling
      const isSpotifyUrl = url.includes('open.spotify.com');
      
      if (isDirectImageUrl) {
        // Handle direct image URLs
        try {
          const imageResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (!imageResponse.ok) {
            return res.status(404).json({ message: 'Image not found at the provided URL' });
          }
          
          const contentType = imageResponse.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) {
            return res.status(400).json({ message: 'URL does not point to a valid image' });
          }
          
          const buffer = await imageResponse.arrayBuffer();
          
          // Set appropriate headers for image response
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', buffer.byteLength);
          return res.send(Buffer.from(buffer));
          
        } catch (error) {
          return res.status(404).json({ message: 'Failed to fetch image from URL' });
        }
      }

      // Handle Spotify URLs with special scraping
      if (isSpotifyUrl) {
        try {
          const { load } = await import('cheerio');
          const spotifyResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!spotifyResponse.ok) {
            return res.status(404).json({ message: 'Failed to fetch Spotify page' });
          }
          
          const html = await spotifyResponse.text();
          const $ = load(html);
          
          // Try multiple selectors for Spotify album artwork
          let imageUrl = '';
          const possibleSelectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'img[data-testid="cover-art"]',
            'img[alt*="Cover"]',
            '.cover-art img',
            '.track-info img'
          ];
          
          for (const selector of possibleSelectors) {
            const imageElement = $(selector);
            if (imageElement.length) {
              const src = imageElement.attr('content') || imageElement.attr('src');
              if (src && (src.includes('scdn.co') || src.includes('spotify'))) {
                imageUrl = src;
                break;
              }
            }
          }
          
          if (!imageUrl) {
            // Fallback to Spotify logo
            imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/512px-Spotify_logo_without_text.svg.png';
          }
          
          // Fetch the found image
          const imageResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (!imageResponse.ok) {
            return res.status(404).json({ message: 'Failed to fetch Spotify album artwork' });
          }
          
          const buffer = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', buffer.byteLength);
          return res.send(Buffer.from(buffer));
          
        } catch (error) {
          return res.status(404).json({ message: 'Failed to extract Spotify album artwork' });
        }
      }

      // Handle webpage scraping for non-direct image URLs
      const { load } = await import('cheerio');

      // Fetch the webpage
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);

      // Try to find the main image in order of preference
      let imageUrl = '';
      
      // 1. Open Graph image
      imageUrl = $('meta[property="og:image"]').attr('content') || '';
      
      // 2. Twitter card image
      if (!imageUrl) {
        imageUrl = $('meta[name="twitter:image"]').attr('content') || '';
      }
      
      // 3. Look for product images or main content images
      if (!imageUrl) {
        const possibleSelectors = [
          'img[class*="product"]',
          'img[class*="main"]',
          'img[class*="hero"]',
          'img[class*="primary"]',
          'img[data-src]',
          'img[src]'
        ];
        
        for (const selector of possibleSelectors) {
          const img = $(selector).first();
          if (img.length) {
            imageUrl = img.attr('src') || img.attr('data-src') || '';
            if (imageUrl) break;
          }
        }
      }

      if (!imageUrl) {
        return res.status(404).json({ message: 'No suitable image found on the page' });
      }

      // Convert relative URLs to absolute
      if (imageUrl.startsWith('/')) {
        const urlObj = new URL(url);
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } else if (!imageUrl.startsWith('http')) {
        const urlObj = new URL(url);
        imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
      }

      // Fetch the actual image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(404).json({ message: 'Failed to fetch image' });
      }

      // Set appropriate headers and pipe the image
      res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Content-Length', imageResponse.headers.get('content-length') || '0');
      
      // Convert the response to a buffer and send
      const buffer = await imageResponse.buffer();
      res.send(buffer);
      
    } catch (error: any) {
      console.error('Image scraping error:', error);
      res.status(500).json({ message: 'Failed to scrape image from URL' });
    }
  });

  // Delete post endpoint
  app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      if (post.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this post' });
      }
      
      await storage.deletePost(postId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete category endpoint
  app.delete('/api/categories/:id', authenticateToken, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      if (category.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this category' });
      }
      
      await storage.deleteCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Share profile endpoint
  app.post('/api/user/:userId/share', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      await storage.sharePost(0, userId); // Use 0 as postId for profile shares
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Enhanced social features from artifact
  
  // Friends endpoints
  app.get('/api/friends', authenticateToken, async (req: any, res) => {
    try {
      const friends = await storage.getFriends(req.user.userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/friend-requests', authenticateToken, async (req: any, res) => {
    try {
      const requests = await storage.getFriendRequests(req.user.userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/friend-request', authenticateToken, async (req: any, res) => {
    try {
      const { friendId } = createFriendshipSchema.parse(req.body);
      
      if (friendId === req.user.userId) {
        return res.status(400).json({ message: 'Cannot send friend request to yourself' });
      }

      const targetUser = await storage.getUser(friendId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.sendFriendRequest(req.user.userId, friendId);
      res.json({ success: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/friend-request/:requestId/respond', authenticateToken, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action } = req.body;
      
      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }
      
      await storage.respondToFriendRequest(requestId, action);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  app.get('/api/friends/posts', authenticateToken, async (req: any, res) => {
    try {
      const friendsPosts = await storage.getFriendsPosts(req.user.userId);
      res.json(friendsPosts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/friends/recent-posts', authenticateToken, async (req: any, res) => {
    try {
      const friendsWithRecentPosts = await storage.getFriendsWithRecentPosts(req.user.userId);
      res.json(friendsWithRecentPosts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all users endpoint
  app.get('/api/users/all', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, username, name, profile_picture_url as "profilePictureUrl" FROM users ORDER BY id');
      res.json(result.rows);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // User search endpoint - now accepts any length query
  app.get('/api/search/users', async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== 'string') {
        // Return all users if no query
        const allUsers = await db.select({
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }).from(users);
        return res.json(allUsers);
      }
      
      const users_result = await storage.searchUsers(query);
      const safeUsers = users_result.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Hashtag endpoints
  app.get('/api/hashtags/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const trendingHashtags = await storage.getTrendingHashtags(limit);
      res.json(trendingHashtags);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/:name/posts', async (req, res) => {
    try {
      const hashtagName = req.params.name;
      const posts = await storage.getPostsByHashtag(hashtagName);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Multiple hashtag search with sorting
  app.get('/api/search/hashtags', async (req, res) => {
    try {
      const tags = req.query.tags as string;
      const sort = req.query.sort as string || 'popular';
      
      if (!tags) {
        return res.json([]);
      }

      const hashtagNames = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (hashtagNames.length === 0) {
        return res.json([]);
      }

      const posts = await storage.getPostsByMultipleHashtags(hashtagNames, sort);
      res.json(posts);
    } catch (error) {
      console.error('Hashtag search error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Tagged posts endpoint
  app.get('/api/tagged-posts', authenticateToken, async (req: any, res) => {
    try {
      const taggedPosts = await storage.getTaggedPosts(req.user.userId);
      res.json(taggedPosts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Privacy-based posts endpoint
  app.get('/api/posts/privacy/:privacy', authenticateToken, async (req: any, res) => {
    try {
      const privacy = req.params.privacy;
      const posts = await storage.getPostsByPrivacy(privacy, req.user.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Notifications endpoints
  app.get('/api/notifications', authenticateToken, async (req: any, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/notifications/unread-count', authenticateToken, async (req: any, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/notifications/:id/viewed', authenticateToken, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsViewed(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Report endpoints
  app.post('/api/reports', authenticateToken, async (req: any, res) => {
    try {
      const reportData = createReportSchema.parse(req.body);
      const report = await storage.createReport({ ...reportData, userId: req.user.userId });
      res.json(report);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Admin endpoints
  app.get('/api/admin/reports', authenticateToken, async (req: any, res) => {
    try {
      // Check if user is admin (you might want to add an isAdmin field to users)
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') { // Simple admin check
        return res.status(403).json({ message: 'Admin access required' });
      }

      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/reports/:id', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const reportId = parseInt(req.params.id);
      await storage.deleteReport(reportId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/analytics', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/blacklist', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const blacklist = await storage.getBlacklist();
      res.json(blacklist);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/blacklist', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { type, value } = req.body;
      await storage.addToBlacklist(type, value);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/flag', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.userId);
      await storage.flagUser(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/users/:userId/flag', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user || user.username !== 'stickles') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.userId);
      await storage.unflagUser(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
