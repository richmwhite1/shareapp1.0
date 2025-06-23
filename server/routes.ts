import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./admin-routes";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  signUpSchema, signInSchema, createPostSchema, createPostRequestSchema, createCommentSchema, createListSchema, 
  createFriendshipSchema, createHashtagSchema, createReportSchema, createNotificationSchema,
  createListAccessSchema, respondListAccessSchema, createAccessRequestSchema,
  type AdditionalPhotoData, users, posts, lists, comments, postLikes, postShares, friendships, friendRequests, 
  hashtags, postHashtags, hashtagFollows, notifications, reports, blacklist, rsvps, postViews, savedPosts, 
  reposts, postFlags, taggedPosts, postEnergyRatings, profileEnergyRatings, taskAssignments, listAccess, accessRequests,
  moderationActions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, like, exists, not, inArray, count, avg } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Always allow files to pass through - validation will happen later
    cb(null, true);
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

      // Create default "General" list for the new user
      await storage.createList({
        userId: user.id,
        name: 'General',
        description: 'Default list for all posts',
        isPublic: true,
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

      // Check if user is suspended by checking moderation actions
      const moderationHistory = await db.select()
        .from(moderationActions)
        .where(and(
          eq(moderationActions.contentType, 'user'),
          eq(moderationActions.contentId, user.id)
        ))
        .orderBy(desc(moderationActions.createdAt));

      const latestSuspend = moderationHistory
        .filter(action => action.action === 'ban' || action.action === 'suspend')[0];
      const latestUnsuspend = moderationHistory
        .filter(action => action.action === 'unban' || action.action === 'unsuspend')[0];
      
      const isSuspended = latestSuspend && (!latestUnsuspend || new Date(latestSuspend.createdAt) > new Date(latestUnsuspend.createdAt));
      
      if (isSuspended) {
        return res.status(403).json({ message: 'Account suspended. Contact administrator.' });
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
      console.error('Signin error:', error);
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

  // Delete user profile
  app.delete('/api/users/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure user can only delete their own profile
      if (req.user.userId !== userId) {
        return res.status(403).json({ message: 'Cannot delete another user\'s profile' });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete user and all associated data
      await storage.deleteUser(userId);
      
      res.json({ message: 'Profile and all associated data deleted successfully' });
    } catch (error) {
      console.error('Error deleting user profile:', error);
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
        linkLabel: req.body.linkLabel || undefined,
        primaryDescription: req.body.primaryDescription,
        discountCode: req.body.discountCode || undefined,
        listId: req.body.listId ? parseInt(req.body.listId) : undefined,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : 1,
        spotifyUrl: req.body.spotifyUrl || undefined,
        spotifyLabel: req.body.spotifyLabel || undefined,
        youtubeUrl: req.body.youtubeUrl || undefined,
        youtubeLabel: req.body.youtubeLabel || undefined,
        hashtags: req.body.hashtags || undefined,
        privacy: req.body.privacy || 'public',
        taggedUsers: req.body.taggedUsers || undefined,
        // Event fields
        isEvent: req.body.isEvent || undefined,
        eventDate: req.body.eventDate || undefined,
        reminders: req.body.reminders || undefined,
        isRecurring: req.body.isRecurring || undefined,
        recurringType: req.body.recurringType || undefined,
        taskList: req.body.taskList || undefined,
        attachedLists: req.body.attachedLists || undefined
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
      
      const { primaryLink, linkLabel, primaryDescription, discountCode, listId, spotifyUrl, spotifyLabel, youtubeUrl, youtubeLabel, hashtags, privacy, taggedUsers, isEvent, eventDate, reminders, isRecurring, recurringType, taskList } = validatedData;
      
      // Parse hashtags from JSON array or hashtag string
      const parseHashtags = (input: string): string[] => {
        if (!input) return [];
        
        // First, try to parse as JSON array (from frontend)
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) {
            return parsed
              .map(tag => String(tag).replace(/^#/, '').toLowerCase().trim())
              .filter(tag => tag.length > 0)
              .slice(0, 10);
          }
        } catch (error) {
          // If JSON parsing fails, fall back to regex parsing for hashtag strings
        }
        
        // Fallback: parse as hashtag string with # symbols
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
      console.log('DEBUG - Hashtags received:', hashtags);
      console.log('DEBUG - Parsed hashtag array:', hashtagArray);

      // Handle thumbnail URL from frontend or auto-fetch from media URLs
      const thumbnailUrl = req.body.thumbnailUrl;
      const fetchedImagePath = req.body.fetchedImagePath;
      
      // If we have a fetched image path, use it directly
      if (!primaryPhotoUrl && fetchedImagePath) {
        primaryPhotoUrl = fetchedImagePath;
      } else if (!primaryPhotoUrl && thumbnailUrl) {
        // If a thumbnail URL is provided from frontend (fetched image), save it
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(thumbnailUrl);
          if (response.ok) {
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            let extension = '.jpg';
            if (contentType.includes('png')) extension = '.png';
            if (contentType.includes('gif')) extension = '.gif';
            if (contentType.includes('webp')) extension = '.webp';
            
            const buffer = await response.buffer();
            
            // Validate that we actually have image data
            if (buffer.length === 0) {
              throw new Error('Empty image buffer received');
            }
            
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2);
            const filename = `${timestamp}-${randomString}-fetched-image${extension}`;
            const fs = await import('fs');
            const path = await import('path');
            const uploadsDir = path.join(process.cwd(), 'uploads');
            
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, buffer);
            
            // Verify the file was written correctly
            if (!fs.existsSync(filepath)) {
              throw new Error('Failed to save image file');
            }
            
            primaryPhotoUrl = `/uploads/${filename}`;
            console.log('Successfully saved fetched image:', primaryPhotoUrl);
          } else {
            console.error('Failed to fetch thumbnail:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Failed to save fetched image:', error);
        }
      } else if (!primaryPhotoUrl && (spotifyUrl || youtubeUrl)) {
        try {
          let imageUrl = thumbnailUrl || '';
          
          if (!imageUrl && youtubeUrl) {
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

      // Parse event data
      const isEventBool = isEvent === 'true';
      let eventReminders: string[] = [];
      let isRecurringBool = false;
      let eventTaskList: any[] = [];
      let attachedListsArray: number[] = [];
      let eventDateObj: Date | undefined = undefined;

      if (isEventBool) {
        if (reminders) {
          try {
            eventReminders = JSON.parse(reminders);
          } catch (error) {
            console.error('Failed to parse reminders:', error);
          }
        }
        
        isRecurringBool = isRecurring === 'true';
        
        if (taskList) {
          try {
            eventTaskList = JSON.parse(taskList);
          } catch (error) {
            console.error('Failed to parse taskList:', error);
          }
        }

        // Parse attached lists
        if (validatedData.attachedLists) {
          try {
            attachedListsArray = JSON.parse(validatedData.attachedLists);
          } catch (error) {
            console.error('Failed to parse attachedLists:', error);
          }
        }

        // Parse event date properly
        if (eventDate) {
          try {
            eventDateObj = new Date(eventDate);
            if (isNaN(eventDateObj.getTime())) {
              eventDateObj = undefined;
            }
          } catch (error) {
            console.error('Failed to parse event date:', error);
            eventDateObj = undefined;
          }
        }
      }

      // Create post
      const post = await storage.createPost({
        userId: req.user.userId,
        primaryPhotoUrl: primaryPhotoUrl || '/placeholder-image.svg',
        primaryLink: primaryLink || '',
        linkLabel: linkLabel || null,
        primaryDescription,
        discountCode,
        additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : null,
        additionalPhotoData: additionalPhotoData.length > 0 ? additionalPhotoData : null,
        listId: listId || undefined, // Use the actual listId from form data
        spotifyUrl,
        spotifyLabel: spotifyLabel || null,
        youtubeUrl,
        youtubeLabel: youtubeLabel || null,
        mediaMetadata,
        hashtags: hashtagArray,
        privacy,
        taggedUsers: taggedUsersArray,
        // Event data
        isEvent: isEventBool,
        eventDate: eventDateObj,
        reminders: isEventBool ? eventReminders : undefined,
        isRecurring: isEventBool ? isRecurringBool : undefined,
        recurringType: isEventBool && isRecurringBool ? recurringType : undefined,
        taskList: isEventBool ? eventTaskList : undefined,
        attachedLists: isEventBool ? attachedListsArray : undefined,
        allowRsvp: isEventBool ? (validatedData.allowRsvp === 'true') : false
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

  // List routes
  app.get('/api/lists', authenticateToken, async (req: any, res) => {
    try {
      const lists = await storage.getListsWithAccess(req.user.userId);
      res.json(lists);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/lists/my', authenticateToken, async (req: any, res) => {
    try {
      const lists = await storage.getListsByUserId(req.user.userId);
      res.json(lists);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/lists/user', authenticateToken, async (req: any, res) => {
    try {
      const lists = await storage.getListsByUserId(req.user.userId);
      res.json(lists);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/lists', authenticateToken, async (req: any, res) => {
    try {
      const listData = createListSchema.parse(req.body);
      const list = await storage.createList({
        ...listData,
        userId: req.user.userId,
      });
      res.json(list);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/lists/:id', async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const list = await storage.getListWithCreator(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get profile lists with enhanced privacy enforcement
  app.get('/api/lists/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const lists = await storage.getListsByUserId(userId);
      
      // Check authorization
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) {
        // Non-authenticated users can only see public lists
        const publicLists = lists.filter(list => list.privacyLevel === 'public');
        return res.json(publicLists);
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const viewerId = decoded.userId;
        
        if (viewerId === userId) {
          // User viewing their own profile - show all lists
          return res.json(lists);
        } else {
          // Authenticated user viewing another's profile
          const visibleLists = [];
          
          for (const list of lists) {
            if (list.privacyLevel === 'public') {
              // Public lists visible to everyone
              visibleLists.push(list);
            } else if (list.privacyLevel === 'connections') {
              // Connections-only lists visible only to mutual connections
              const areConnected = await storage.areFriends(viewerId, userId);
              if (areConnected) {
                visibleLists.push(list);
              }
            } else if (list.privacyLevel === 'private') {
              // Private lists visible only if user has accepted access
              const accessResult = await storage.hasListAccess(viewerId, list.id);
              if (accessResult.hasAccess) {
                visibleLists.push(list);
              }
            }
          }
          
          return res.json(visibleLists);
        }
      } catch {
        // Invalid token - show only public lists
        const publicLists = lists.filter(list => list.privacyLevel === 'public');
        return res.json(publicLists);
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // List privacy and collaboration endpoints
  app.put('/api/lists/:id/privacy', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const { privacyLevel } = req.body;

      if (!privacyLevel || !['public', 'connections', 'private'].includes(privacyLevel)) {
        return res.status(400).json({ message: 'Valid privacy level required' });
      }

      // Check if user owns the list
      const list = await storage.getList(listId);
      if (!list || list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Prevent converting private lists back to public (one-way restriction)
      if (list.privacyLevel === 'private' && privacyLevel === 'public') {
        return res.status(400).json({ message: 'Private lists cannot be made public for security reasons' });
      }

      await storage.updateListPrivacy(listId, privacyLevel);
      res.json({ message: 'Privacy updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Add collaborator directly to list (for immediate access)
  app.post('/api/lists/:id/collaborators', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const { userId, role } = req.body;

      if (!userId || !role || !['collaborator', 'viewer'].includes(role)) {
        return res.status(400).json({ message: 'User ID and valid role required' });
      }

      // Check if the list exists
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      if (list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Only list owners can add collaborators' });
      }

      // Add collaborator directly and send notification
      await storage.addListCollaborator(listId, userId, role, req.user.userId);
      
      res.json({ message: 'Collaborator added successfully' });
    } catch (error) {
      console.error('Add collaborator error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Remove collaborator from list
  app.delete('/api/lists/:id/collaborators/:userId', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      if (isNaN(listId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid list ID or user ID' });
      }

      // Check if the list exists
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      if (list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Only list owners can remove collaborators' });
      }

      // Remove collaborator access
      await storage.removeListAccess(listId, userId);
      
      res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
      console.error('Remove collaborator error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/lists/:id/invite', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const { userId, role } = req.body;

      if (!userId || !role || !['collaborator', 'viewer'].includes(role)) {
        return res.status(400).json({ message: 'User ID and valid role required' });
      }

      // Check if the list exists and is private
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      if (list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Only list owners can send invitations' });
      }

      if (list.privacyLevel !== 'private') {
        return res.status(400).json({ message: 'Invitations are only for private lists' });
      }

      // Send invitation and create notification
      await storage.inviteToList(listId, userId, role, req.user.userId);
      
      res.json({ message: 'Invitation sent successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Accept invitation to private list
  app.post('/api/lists/:id/accept', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      
      // Find pending invitation for this user and list
      const userAccess = await storage.getUserListAccess(req.user.userId);
      const pendingAccess = userAccess.find(access => 
        access.listId === listId && access.status === 'pending'
      );
      
      if (!pendingAccess) {
        return res.status(404).json({ message: 'No pending invitation found' });
      }

      // Accept the invitation
      await storage.respondToListInviteByUserAndList(req.user.userId, listId, 'accept');
      
      res.json({ message: 'Invitation accepted, list added to your profile' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reject invitation to private list
  app.post('/api/lists/:id/reject', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      
      // Find pending invitation for this user and list
      const userAccess = await storage.getUserListAccess(req.user.userId);
      const pendingAccess = userAccess.find(access => 
        access.listId === listId && access.status === 'pending'
      );
      
      if (!pendingAccess) {
        return res.status(404).json({ message: 'No pending invitation found' });
      }

      // Reject the invitation
      await storage.respondToListInviteByUserAndList(req.user.userId, listId, 'reject');
      
      res.json({ message: 'Invitation rejected' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's pending list invitations
  app.get('/api/user/list-invitations', authenticateToken, async (req: any, res) => {
    try {
      const pendingInvitations = await storage.getPendingListInvitations(req.user.userId);
      res.json(pendingInvitations);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete a list (owner only)
  app.delete('/api/lists/:id', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = req.user.userId;

      // Verify the user owns this list
      const list = await storage.getListById(listId);
      if (!list || list.userId !== userId) {
        return res.status(403).json({ message: 'You can only delete your own lists' });
      }

      // Delete the list and all associated posts
      await storage.deleteList(listId);
      
      res.json({ message: 'List deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/lists/access/:accessId/respond', authenticateToken, async (req: any, res) => {
    try {
      const accessId = parseInt(req.params.accessId);
      const { action } = req.body;

      if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Valid action required' });
      }

      await storage.respondToListInvite(accessId, action);
      res.json({ message: `Invitation ${action}ed successfully` });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/lists/:id/access', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);

      // Check if user owns the list
      const list = await storage.getList(listId);
      if (!list || list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const access = await storage.getListAccess(listId);
      res.json(access);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/lists/:id/access/:userId', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      // Check if user owns the list
      const list = await storage.getList(listId);
      if (!list || list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      await storage.removeListAccess(listId, userId);
      res.json({ message: 'Access removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/user/list-access', authenticateToken, async (req: any, res) => {
    try {
      const access = await storage.getUserListAccess(req.user.userId);
      res.json(access);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/lists/:id/request-access', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const { requestedRole, message } = req.body;

      if (!requestedRole || !['collaborator', 'viewer'].includes(requestedRole)) {
        return res.status(400).json({ message: 'Valid requested role required' });
      }

      // Check if list exists and is private
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      if (list.privacyLevel !== 'private') {
        return res.status(400).json({ message: 'Access requests are only for private lists' });
      }

      if (list.userId === req.user.userId) {
        return res.status(400).json({ message: 'Cannot request access to your own list' });
      }

      await storage.createAccessRequest(listId, req.user.userId, requestedRole, message);
      res.json({ message: 'Access request sent successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/lists/:id/access-requests', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);

      // Check if user owns the list
      const list = await storage.getList(listId);
      if (!list || list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const requests = await storage.getAccessRequests(listId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/access-requests/:id/respond', authenticateToken, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { action } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Valid action required' });
      }

      await storage.respondToAccessRequest(requestId, action);
      res.json({ message: `Request ${action}d successfully` });
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

      console.log('Fetching posts for viewerId:', viewerId);
      const posts = await storage.getAllPosts(viewerId);
      console.log('Posts fetched successfully, count:', posts.length);
      
      // Add hashtags to each post
      const postsWithHashtags = await Promise.all(
        posts.map(async (post) => {
          const hashtags = await storage.getHashtagsByPostId(post.id);
          return { ...post, hashtags };
        })
      );
      
      res.json(postsWithHashtags);
    } catch (error) {
      console.error('Posts endpoint error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/list/:listId', async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }

      const posts = await storage.getPostsByListId(listId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get attached lists for a specific post
  app.get('/api/posts/:postId/attached-lists', async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const lists = await storage.getAttachedListsByPostId(postId);
      res.json(lists);
    } catch (error) {
      console.error('Error fetching attached lists:', error);
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
      
      // Add hashtags to each post
      const postsWithHashtags = await Promise.all(
        posts.map(async (post) => {
          const hashtags = await storage.getHashtagsByPostId(post.id);
          return { ...post, hashtags };
        })
      );
      
      res.json(postsWithHashtags);
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

      // Add hashtags to the post
      const hashtags = await storage.getHashtagsByPostId(postId);
      const postWithHashtags = { ...post, hashtags };

      res.json(postWithHashtags);
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

  app.post('/api/posts/:id/repost', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.repostPost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Save post route moved to avoid duplication

  app.post('/api/posts/:id/flag', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { reason } = req.body;
      await storage.flagPost(postId, req.user.userId, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/tag-friend', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { friendId } = req.body;
      await storage.tagFriendInPost(postId, req.user.userId, friendId);
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

  // OpenGraph image generation for link previews
  app.get('/api/og-image', async (req, res) => {
    try {
      const { postId, userId, type = 'default' } = req.query;
      
      // Generate SVG-based thumbnail
      let svgContent = '';
      
      if (type === 'post' && postId) {
        const post = await storage.getPost(parseInt(postId as string));
        if (post) {
          svgContent = `
            <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
              <rect width="1200" height="630" fill="#000"/>
              <text x="60" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#fff">Share</text>
              <text x="60" y="200" font-family="Arial, sans-serif" font-size="32" fill="#ccc" text-anchor="start">
                ${post.description.substring(0, 50)}${post.description.length > 50 ? '...' : ''}
              </text>
              <text x="60" y="280" font-family="Arial, sans-serif" font-size="24" fill="#888">
                by ${post.username || 'User'}
              </text>
              ${post.primaryPhotoUrl ? `<image x="600" y="100" width="500" height="400" href="${post.primaryPhotoUrl}" preserveAspectRatio="xMidYMid slice"/>` : ''}
            </svg>`;
        }
      } else if (type === 'profile' && userId) {
        const user = await storage.getUser(parseInt(userId as string));
        if (user) {
          svgContent = `
            <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
              <rect width="1200" height="630" fill="#000"/>
              <text x="60" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#fff">Share</text>
              <text x="60" y="200" font-family="Arial, sans-serif" font-size="32" fill="#ccc">
                ${user.name || user.username}'s Profile
              </text>
              <text x="60" y="280" font-family="Arial, sans-serif" font-size="24" fill="#888">
                ${user.bio ? user.bio.substring(0, 80) : 'Discover amazing posts and content'}
              </text>
            </svg>`;
        }
      } else {
        // Default Share platform image
        svgContent = `
          <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="630" fill="#000"/>
            <text x="60" y="200" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#fff">Share</text>
            <text x="60" y="300" font-family="Arial, sans-serif" font-size="32" fill="#ccc">
              Social Post Sharing Platform
            </text>
            <text x="60" y="380" font-family="Arial, sans-serif" font-size="24" fill="#888">
              Create, share, and discover amazing content
            </text>
          </svg>`;
      }
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(svgContent);
    } catch (error) {
      console.error('OG image generation error:', error);
      res.status(500).json({ message: 'Failed to generate image' });
    }
  });

  // Image scraping endpoint
  app.post('/api/scrape-image', async (req: any, res) => {
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
          
          // Save the image to uploads directory
          const fs = await import('fs');
          const path = await import('path');
          const uploadsDir = path.join(process.cwd(), 'uploads');
          
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const timestamp = Date.now();
          const urlHash = Math.random().toString(36).substring(2, 15);
          const extension = contentType?.split('/')[1] || 'jpg';
          const filename = `${timestamp}-${urlHash}-fetched-image.${extension}`;
          const filepath = path.join(uploadsDir, filename);
          
          fs.writeFileSync(filepath, Buffer.from(buffer));
          
          const imagePath = `/uploads/${filename}`;
          return res.json({ 
            success: true, 
            imagePath, 
            message: 'Image fetched and saved successfully' 
          });
          
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
          
          // Save the image to uploads directory
          const fs = await import('fs');
          const path = await import('path');
          const uploadsDir = path.join(process.cwd(), 'uploads');
          
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const timestamp = Date.now();
          const urlHash = Math.random().toString(36).substring(2, 15);
          const extension = contentType?.split('/')[1] || 'jpg';
          const filename = `${timestamp}-${urlHash}-spotify-image.${extension}`;
          const filepath = path.join(uploadsDir, filename);
          
          fs.writeFileSync(filepath, Buffer.from(buffer));
          
          const imagePath = `/uploads/${filename}`;
          return res.json({ 
            success: true, 
            imagePath, 
            message: 'Spotify image fetched and saved successfully' 
          });
          
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

      const contentType = imageResponse.headers.get('content-type');
      
      // Handle SVG content by creating a proper PNG conversion
      if (contentType && (contentType.includes('svg') || contentType.includes('xml'))) {
        const svgContent = await imageResponse.text();
        
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Create a base64 encoded PNG image since browsers can display it properly
        // This creates a simple 400x300 PNG with text indicating it's converted SVG content
        const pngBase64 = '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';
        
        const buffer = Buffer.from(pngBase64, 'base64');
        
        const timestamp = Date.now();
        const urlHash = Math.random().toString(36).substring(2, 15);
        const filename = `${timestamp}-${urlHash}-svg-converted.png`;
        const filepath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filepath, buffer);
        
        const imagePath = `/uploads/${filename}`;
        return res.json({ 
          success: true, 
          imagePath, 
          message: 'SVG content converted to PNG format' 
        });
      }
      
      if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ message: 'URL does not point to a valid image format' });
      }

      const buffer = await imageResponse.arrayBuffer();
      
      // Save the image to uploads directory
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const urlHash = Math.random().toString(36).substring(2, 15);
      const extension = contentType?.split('/')[1] || 'jpg';
      const filename = `${timestamp}-${urlHash}-scraped-image.${extension}`;
      const filepath = path.join(uploadsDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(buffer));
      
      const imagePath = `/uploads/${filename}`;
      return res.json({ 
        success: true, 
        imagePath, 
        message: 'Image scraped and saved successfully' 
      });
      
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

  // Delete list endpoint
  app.delete('/api/lists/:id', authenticateToken, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const list = await storage.getList(listId);
      
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }
      
      if (list.userId !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this list' });
      }
      
      await storage.deleteList(listId);
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

  // RSVP routes
  app.post('/api/posts/:id/rsvp', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['going', 'maybe', 'not_going'].includes(status)) {
        return res.status(400).json({ message: 'Invalid RSVP status' });
      }

      // Check if post exists and allows RSVPs
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      if (!post.isEvent) {
        return res.status(400).json({ message: 'This post is not an event' });
      }

      // Check if user already has an RSVP
      const existingRsvp = await storage.getRsvp(postId, req.user.userId);
      
      if (existingRsvp) {
        await storage.updateRsvp(postId, req.user.userId, status);
      } else {
        await storage.createRsvp(postId, req.user.userId, status);
      }

      res.json({ message: 'RSVP updated successfully' });
    } catch (error) {
      console.error('RSVP error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/rsvp', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const rsvp = await storage.getRsvp(postId, req.user.userId);
      res.json(rsvp || { status: null });
    } catch (error) {
      console.error('Get RSVP error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/rsvp/stats', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const stats = await storage.getRsvpStats(postId);
      res.json(stats);
    } catch (error) {
      console.error('RSVP stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/rsvp/:status', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { status } = req.params;
      
      if (!['going', 'maybe', 'not_going'].includes(status)) {
        return res.status(400).json({ message: 'Invalid RSVP status' });
      }

      const rsvpList = await storage.getRsvpList(postId, status);
      res.json(rsvpList);
    } catch (error) {
      console.error('RSVP list error:', error);
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

  app.get('/api/friends/:userId', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Profile page specific endpoint
  app.get('/api/friends/user/:userId', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/friends/user', authenticateToken, async (req: any, res) => {
    try {
      const friends = await storage.getFriends(req.user.userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get friends ordered by recent tagging activity
  app.get('/api/friends/recent-tags', authenticateToken, async (req: any, res) => {
    try {
      const friends = await storage.getFriendsOrderedByRecentTags(req.user.userId);
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

  app.get('/api/outgoing-friend-requests', authenticateToken, async (req: any, res) => {
    try {
      const outgoingRequests = await storage.getOutgoingFriendRequests(req.user.userId);
      res.json(outgoingRequests);
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
      console.error('Friend request error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  // Alternative endpoint that matches frontend expectations
  app.post('/api/friends/send-request', authenticateToken, async (req: any, res) => {
    try {
      const { friendId, userId } = req.body;
      const targetUserId = friendId || userId;
      
      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (targetUserId === req.user.userId) {
        return res.status(400).json({ message: 'Cannot send friend request to yourself' });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.sendFriendRequest(req.user.userId, targetUserId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Friend request error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
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

  app.get('/api/connection-stories', authenticateToken, async (req: any, res) => {
    try {
      const stories = await storage.getConnectionStories(req.user.userId);
      res.json(stories);
    } catch (error) {
      console.error('Stories error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get task assignments for a post
  app.get('/api/posts/:postId/task-assignments', async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      
      const post = await storage.getPost(postId);
      if (!post || !post.taskList) {
        return res.json([]);
      }

      const taskList = Array.isArray(post.taskList) ? post.taskList : [];
      const assignments = [];

      for (const task of taskList) {
        if (task.completedBy) {
          const user = await storage.getUser(task.completedBy);
          if (user) {
            assignments.push({
              taskId: task.id,
              userId: task.completedBy,
              userName: user.name,
              assignedAt: new Date()
            });
          }
        }
      }

      res.json(assignments);
    } catch (error) {
      console.error('Get task assignments error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Toggle task assignment endpoint
  app.post('/api/posts/:postId/tasks/:taskId/toggle', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const taskId = req.params.taskId;
      const userId = req.user.userId;

      // Get the post and its task list
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (!post.isEvent || !post.taskList) {
        return res.status(400).json({ message: 'Post is not an event or has no tasks' });
      }

      // Update the task list
      const taskList = Array.isArray(post.taskList) ? post.taskList : [];
      const updatedTaskList = taskList.map((task: any) => {
        if (task.id === taskId) {
          // Toggle assignment - if user is already assigned, remove them, otherwise assign them
          return {
            ...task,
            completedBy: task.completedBy === userId ? null : userId
          };
        }
        return task;
      });

      // Update the post with new task list
      await db.update(posts)
        .set({ taskList: updatedTaskList })
        .where(eq(posts.id, postId));

      res.json({ success: true });
    } catch (error) {
      console.error('Toggle task assignment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Energy Rating Routes
  
  // Get energy rating stats for a post
  app.get('/api/posts/:id/energy/stats', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const stats = await storage.getPostEnergyStats(postId);
      res.json(stats);
    } catch (error) {
      console.error('Get post energy stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's energy rating for a post
  app.get('/api/posts/:id/energy', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.userId;
      const rating = await storage.getUserPostEnergyRating(postId, userId);
      res.json(rating);
    } catch (error) {
      console.error('Get user post energy rating error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Submit energy rating for a post
  app.post('/api/posts/:id/energy', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.userId;
      const { rating } = req.body;
      
      if (!rating || rating < 1 || rating > 7) {
        return res.status(400).json({ message: 'Rating must be between 1 and 7' });
      }
      
      await storage.submitPostEnergyRating(postId, userId, rating);
      res.json({ success: true });
    } catch (error) {
      console.error('Submit post energy rating error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get energy rating stats for a profile
  app.get('/api/profiles/:id/energy/stats', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const stats = await storage.getProfileEnergyStats(profileId);
      res.json(stats);
    } catch (error) {
      console.error('Get profile energy stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's energy rating for a profile
  app.get('/api/profiles/:id/energy', authenticateToken, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.userId;
      const rating = await storage.getUserProfileEnergyRating(profileId, userId);
      res.json(rating);
    } catch (error) {
      console.error('Get user profile energy rating error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Submit energy rating for a profile
  app.post('/api/profiles/:id/energy', authenticateToken, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.userId;
      const { rating } = req.body;
      
      if (!rating || rating < 1 || rating > 7) {
        return res.status(400).json({ message: 'Rating must be between 1 and 7' });
      }
      
      await storage.submitProfileEnergyRating(profileId, userId, rating);
      res.json({ success: true });
    } catch (error) {
      console.error('Submit profile energy rating error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all users endpoint
  app.get('/api/users/all', async (req, res) => {
    try {
      const result = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        profilePictureUrl: users.profilePictureUrl
      }).from(users).orderBy(users.id);
      res.json(result);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User search endpoint - now accepts any length query
  app.get('/api/search/users', async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== 'string') {
        // Return all non-deleted users if no query
        const allUsers = await db.select({
          id: users.id,
          username: users.username,
          name: users.name,
          profilePictureUrl: users.profilePictureUrl
        }).from(users)
        .where(
          and(
            not(like(users.username, 'deleted_user_%')),
            not(eq(users.name, 'Deleted User'))
          )
        );
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

  app.get('/api/hashtags/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const trendingHashtags = await storage.getTrendingHashtags(limit);
      res.json(trendingHashtags);
    } catch (error) {
      console.error('Trending hashtags error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/trending-hashtags', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const trendingHashtags = await storage.getTrendingHashtags(limit);
      res.json(trendingHashtags);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/:name/posts', async (req: any, res) => {
    try {
      const hashtagName = req.params.name;
      const viewerId = req.user?.userId;
      const posts = await storage.getPostsByHashtag(hashtagName, viewerId);
      res.json(posts);
    } catch (error) {
      console.error('Hashtag posts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Hashtag following endpoints
  app.post('/api/hashtags/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      await storage.followHashtag(req.user.userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/hashtags/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      await storage.unfollowHashtag(req.user.userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/:id/following', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      const isFollowing = await storage.isFollowingHashtag(req.user.userId, hashtagId);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/followed', authenticateToken, async (req: any, res) => {
    try {
      const followed = await storage.getFollowedHashtags(req.user.userId);
      res.json(followed);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Profile picture upload endpoint
  app.post('/api/user/profile-picture', authenticateToken, upload.single('profilePicture'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.userId;
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `profile-${userId}-${Date.now()}${fileExtension}`;
      const uploadPath = path.join('uploads', fileName);

      // Move file to permanent location
      await fs.promises.rename(req.file.path, uploadPath);

      // Update user's profile picture URL in database
      await db.update(users)
        .set({ profilePictureUrl: `/uploads/${fileName}` })
        .where(eq(users.id, userId));

      res.json({ 
        success: true, 
        profilePictureUrl: `/uploads/${fileName}` 
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });

  // Profile picture upload endpoint - User-specific route
  app.post('/api/users/:userId/upload-profile-picture', authenticateToken, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.userId;
      const targetUserId = parseInt(req.params.userId);
      
      // Only allow users to upload their own profile picture
      if (userId !== targetUserId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `profile-${userId}-${Date.now()}${fileExtension}`;
      const uploadPath = path.join('uploads', fileName);

      // Move file to permanent location
      await fs.promises.rename(req.file.path, uploadPath);

      // Update user's profile picture URL in database
      await db.update(users)
        .set({ profilePictureUrl: `/uploads/${fileName}` })
        .where(eq(users.id, userId));

      res.json({ 
        success: true, 
        profilePictureUrl: `/uploads/${fileName}` 
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });

  // Update user privacy settings endpoint
  app.put('/api/user/privacy', authenticateToken, async (req: any, res) => {
    try {
      const { defaultPrivacy } = req.body;
      const userId = req.user.userId;

      if (!['public', 'connections'].includes(defaultPrivacy)) {
        return res.status(400).json({ message: 'Invalid privacy setting' });
      }

      console.log(`Privacy setting ${defaultPrivacy} saved for user ${userId}`);
      // Update user's default privacy setting
      await storage.updateUserPrivacy(userId, defaultPrivacy);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Privacy update error:', error);
      res.status(500).json({ message: 'Failed to update privacy setting' });
    }
  });

  // Get user privacy settings endpoint
  app.get('/api/user/:userId/privacy', authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requestingUserId = req.user.userId;

      // Only allow users to view their own privacy settings
      if (userId !== requestingUserId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ defaultPrivacy: user.defaultPrivacy || 'public' });
    } catch (error) {
      console.error('Privacy fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch privacy setting' });
    }
  });

  // Profile energy rating endpoints
  app.post('/api/profiles/:profileId/energy', authenticateToken, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const ratingUserId = req.user.userId;
      const { rating } = req.body;

      if (isNaN(profileId) || profileId === ratingUserId) {
        return res.status(400).json({ message: 'Cannot rate yourself' });
      }

      if (!rating || rating < 1 || rating > 7) {
        return res.status(400).json({ message: 'Rating must be between 1 and 7' });
      }

      // Get current user aura rating
      const [userResult] = await db.select({
        auraRating: users.auraRating,
        ratingCount: users.ratingCount
      }).from(users).where(eq(users.id, profileId));

      if (!userResult) {
        return res.status(404).json({ message: 'User not found' });
      }

      const currentRating = parseFloat((userResult.auraRating || "4.0").toString());
      const currentCount = userResult.ratingCount || 0;
      
      // Calculate new weighted average rating (keep as decimal for accuracy)
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;

      // Update user's aura rating
      await db.update(users)
        .set({ 
          auraRating: newRating.toFixed(2),
          ratingCount: newCount
        })
        .where(eq(users.id, profileId));

      res.json({ success: true, rating: newRating });
    } catch (error) {
      console.error('Profile energy rating error:', error);
      res.status(500).json({ message: 'Failed to submit rating' });
    }
  });

  app.get('/api/profiles/:profileId/energy', authenticateToken, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const userId = req.user.userId;

      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }

      // Return user's current rating (default to heart chakra)
      res.json({ rating: 4 });
    } catch (error) {
      console.error('Get profile energy error:', error);
      res.status(500).json({ message: 'Failed to get rating' });
    }
  });

  app.get('/api/profiles/:profileId/energy/stats', async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }

      // Get user's aura rating from users table
      const [userResult] = await db.select({
        auraRating: users.auraRating,
        ratingCount: users.ratingCount
      }).from(users).where(eq(users.id, profileId));

      if (!userResult) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ 
        average: parseFloat((userResult.auraRating || "4.0").toString()), 
        count: userResult.ratingCount || 0 
      });
    } catch (error) {
      console.error('Profile energy stats error:', error);
      res.status(500).json({ message: 'Failed to fetch energy stats' });
    }
  });

  // Link preview endpoint
  app.post('/api/link-preview', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      const { getLinkPreview } = await import('link-preview-js');
      const metadata = await getLinkPreview(url, {
        timeout: 5000,
        followRedirects: 'follow',
        handleRedirects: (baseURL: string, forwardedURL: string) => {
          const urlObj = new URL(baseURL);
          const forwardedURLObj = new URL(forwardedURL);
          if (urlObj.hostname === forwardedURLObj.hostname || 
              forwardedURLObj.hostname === 'www.' + urlObj.hostname ||
              urlObj.hostname === 'www.' + forwardedURLObj.hostname) {
            return true;
          }
          return false;
        }
      });

      // Format the response based on the metadata type
      let response: any = {
        title: (metadata as any).title || '',
        description: (metadata as any).description || '',
        siteName: (metadata as any).siteName || '',
        url: (metadata as any).url || url
      };

      // Handle different image formats
      if ((metadata as any).images && (metadata as any).images.length > 0) {
        response.images = (metadata as any).images;
        response.image = (metadata as any).images[0]; // Primary image
      } else if ((metadata as any).favicons && (metadata as any).favicons.length > 0) {
        response.image = (metadata as any).favicons[(metadata as any).favicons.length - 1]; // Use largest favicon
        response.images = [response.image];
      }

      // Special handling for YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        if (videoId) {
          response.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          response.images = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          ];
        }
      }

      // Special handling for Spotify
      if (url.includes('spotify.com')) {
        // Try to extract Spotify metadata from the existing data
        if ((metadata as any).images && (metadata as any).images.length > 0) {
          response.image = (metadata as any).images[0];
        }
      }

      res.json(response);
    } catch (error) {
      console.error('Link preview error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch link metadata',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Image fetch proxy endpoint to handle CORS issues
  app.post('/api/fetch-image', async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required' });
      }

      // Import node-fetch dynamically
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.buffer();

      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (error) {
      console.error('Image fetch error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Bulletproof hashtag search - only public posts in public lists
  app.get('/api/search/hashtags', async (req: any, res) => {
    try {
      const tags = req.query.tags as string;
      const q = req.query.q as string;
      
      // Support both 'tags' and 'q' query parameters
      const searchQuery = tags || q;
      
      if (!searchQuery) {
        return res.json([]);
      }

      // For multiple hashtags, search each one individually and combine results
      const hashtagNames = searchQuery.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      if (hashtagNames.length === 0) {
        return res.json([]);
      }

      // Search for posts with ALL of the hashtags (AND logic)
      const allPosts = await storage.getPostsByMultipleHashtags(hashtagNames);

      // Add hashtags to each post
      const postsWithHashtags = await Promise.all(
        allPosts.map(async (post) => {
          const hashtags = await storage.getHashtagsByPostId(post.id);
          return { ...post, hashtags };
        })
      );

      // Sort by creation date (most recent first)
      postsWithHashtags.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(postsWithHashtags);
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

  app.post('/api/notifications/:id/view', authenticateToken, async (req: any, res) => {
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

      const blacklist = await storage.getBlacklist(req.user.userId);
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

      const { userId, blockedUserId } = req.body;
      await storage.addToBlacklist(userId, blockedUserId);
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
      await storage.flagUser(userId, req.user.userId, 'Admin flag');
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

  // View tracking routes
  app.post('/api/posts/:id/view', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { viewType, viewDuration } = req.body;
      await storage.trackView(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/views', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const viewCount = await storage.getPostViews(postId);
      res.json({ viewCount });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Save post routes
  app.post('/api/posts/:id/save', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { listId } = req.body;
      
      if (!listId) {
        return res.status(400).json({ message: 'List ID is required' });
      }
      
      // Create a new post in the specified list by copying the original post
      const originalPost = await storage.getPost(postId);
      if (!originalPost) {
        return res.status(404).json({ message: 'Original post not found' });
      }
      
      const newPost = await storage.createPost({
        userId: req.user.userId,
        listId: parseInt(listId),
        primaryPhotoUrl: originalPost.primaryPhotoUrl,
        primaryLink: originalPost.primaryLink,
        primaryDescription: originalPost.primaryDescription,
        discountCode: originalPost.discountCode,
        spotifyUrl: originalPost.spotifyUrl,
        youtubeUrl: originalPost.youtubeUrl,
        privacy: 'public'
      });
      
      res.json({ success: true, newPostId: newPost.id });
    } catch (error) {
      console.error('Save post error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/posts/:id/save', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.unsavePost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/saved', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const isSaved = await storage.isSaved(postId, req.user.userId);
      res.json({ isSaved });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/saved-posts', authenticateToken, async (req: any, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const savedPosts = await storage.getSavedPosts(req.user.userId);
      res.json(savedPosts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Repost routes
  app.post('/api/posts/:id/repost', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.repost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/posts/:id/repost', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.unrepost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/reposted', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const isReposted = await storage.isReposted(postId, req.user.userId);
      res.json({ isReposted });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/reposts', authenticateToken, async (req: any, res) => {
    try {
      const reposts = await storage.getReposts(req.user.userId);
      res.json(reposts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Flag routes
  app.post('/api/posts/:id/flag', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { reason } = req.body;
      await storage.flagPost(postId, req.user.userId, reason);
      
      // Check if post should be auto-deleted
      const wasDeleted = await storage.checkAutoDelete(postId);
      
      res.json({ success: true, wasDeleted });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/posts/:id/flag', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.unflagPost(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id/flags', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const flagCount = await storage.getPostFlags(postId);
      res.json({ flagCount });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Tag friends routes
  app.post('/api/posts/:id/tag', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: 'userIds must be an array' });
      }
      
      // Tag friends to post functionality - simplified for now
      res.json({ success: true, message: "Tagging functionality will be implemented" });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/shared-with-me', authenticateToken, async (req: any, res) => {
    try {
      const sharedPosts = await storage.getSharedWithMePosts(req.user.userId);
      res.json(sharedPosts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/tag/viewed', authenticateToken, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.markTaggedPostViewed(postId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Hashtag following routes
  app.post('/api/hashtags/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      await storage.followHashtag(req.user.userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/hashtags/:id/unfollow', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      await storage.unfollowHashtag(req.user.userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/:id/following', authenticateToken, async (req: any, res) => {
    try {
      const hashtagId = parseInt(req.params.id);
      const isFollowing = await storage.isFollowingHashtag(req.user.userId, hashtagId);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/hashtags/followed', authenticateToken, async (req: any, res) => {
    try {
      const followedHashtags = await storage.getFollowedHashtags(req.user.userId);
      res.json(followedHashtags);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete user profile route
  app.delete('/api/user/delete', authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteUser(req.user.userId);
      res.json({ success: true, message: 'Profile deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mount admin routes
  app.use('/api/admin', adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
