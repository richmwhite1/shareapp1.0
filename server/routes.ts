import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { signUpSchema, signInSchema, createPostSchema, createCommentSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
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

  // Post routes
  app.post('/api/posts', authenticateToken, upload.fields([
    { name: 'primaryPhoto', maxCount: 1 },
    { name: 'additionalPhotos', maxCount: 4 }
  ]), async (req: any, res) => {
    try {
      const { primaryLink, primaryDescription } = createPostSchema.parse(req.body);
      
      // Handle primary photo upload (required)
      if (!req.files || !req.files['primaryPhoto'] || !req.files['primaryPhoto'][0]) {
        return res.status(400).json({ message: 'Primary photo is required' });
      }

      const primaryPhotoFile = req.files['primaryPhoto'][0];
      const primaryPhotoUrl = saveUploadedFile(primaryPhotoFile);

      // Handle additional photos
      const additionalPhotos: string[] = [];
      if (req.files['additionalPhotos']) {
        for (const file of req.files['additionalPhotos']) {
          additionalPhotos.push(saveUploadedFile(file));
        }
      }

      // Create post
      const post = await storage.createPost({
        userId: req.user.userId,
        primaryPhotoUrl,
        primaryLink,
        primaryDescription,
        additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : null,
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

  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await storage.getAllPosts();
      res.json(posts);
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

      const { text, parentId } = createCommentSchema.parse({
        ...req.body,
        parentId: req.body.parentId ? parseInt(req.body.parentId) : undefined,
      });

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

  const httpServer = createServer(app);
  return httpServer;
}
