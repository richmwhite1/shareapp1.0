import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { adminStorage } from './admin-storage';
import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Extend Request interface for admin
declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}

// Admin authentication middleware
const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const admin = await adminStorage.validateAdminSession(token);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await adminStorage.authenticateAdmin(username, password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await adminStorage.createAdminSession(
      admin.id,
      req.ip,
      req.headers['user-agent']
    );

    // Log admin login
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'admin_login',
      target: 'system',
      targetId: admin.id,
      details: { username: admin.username },
      ipAddress: req.ip,
    });

    res.json({ 
      token, 
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dashboard metrics
router.get('/metrics', adminAuth, async (req, res) => {
  try {
    const metrics = await adminStorage.getDashboardMetrics();
    
    // Simple growth calculation for now
    const userGrowth = 12; // 12% growth
    const contentGrowth = 8; // 8% content growth

    res.json({
      ...metrics,
      userGrowth,
      contentGrowth,
      systemHealth: metrics.flaggedContent > 10 ? 'warning' : 
                   metrics.flaggedContent > 20 ? 'critical' : 'good'
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// User management
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { filter = 'all', search = '' } = req.query;
    
    let users = await adminStorage.searchUsers(search as string, {
      isActive: filter === 'active' ? true : filter === 'banned' ? false : undefined
    });

    // Add post and list counts
    const usersWithCounts = await Promise.all(users.map(async (user) => {
      const posts = await storage.getPostsByUserId ? await storage.getPostsByUserId(user.id) : [];
      const lists = await storage.getListsByUserId ? await storage.getListsByUserId(user.id) : [];
      
      return {
        ...user,
        postCount: posts.length,
        listCount: lists.length,
        email: `${user.username}@example.com`
      };
    }));

    res.json(usersWithCounts);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban user
router.post('/users/:userId/ban', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { reason } = req.body;
    
    await adminStorage.banUser(userId, req.admin.id, reason);
    
    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: 'user_ban',
      target: 'user',
      targetId: userId,
      details: { reason },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:userId/unban', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    await adminStorage.unbanUser(userId, req.admin.id, 'Admin unban');
    
    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: 'user_unban',
      target: 'user',
      targetId: userId,
      details: { reason: 'Admin unban' },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Content review queue
router.get('/review-queue', adminAuth, async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    const filters: any = {};
    if (filter === 'pending') filters.status = 'pending';
    if (filter === 'urgent') filters.priority = 'urgent';
    
    const items = await adminStorage.getReviewQueue(filters);
    
    // Add content details for each item
    const itemsWithContent = await Promise.all(items.map(async (item) => {
      let content = null;
      try {
        if (item.contentType === 'post') {
          content = await storage.getPost(item.contentId);
        } else if (item.contentType === 'list') {
          content = await storage.getList(item.contentId);
        }
      } catch (error) {
        console.error(`Failed to fetch ${item.contentType} ${item.contentId}:`, error);
      }
      
      return {
        ...item,
        content
      };
    }));

    res.json(itemsWithContent);
  } catch (error) {
    console.error('Review queue error:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

// Process review item
router.post('/review-queue/:itemId', adminAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { action, reason } = req.body;
    
    await adminStorage.processReviewItem(itemId, action, reason, req.admin.id);
    
    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: `content_${action}`,
      target: 'content_review',
      targetId: itemId,
      details: { action, reason },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Process review error:', error);
    res.status(500).json({ error: 'Failed to process review item' });
  }
});

// System configuration
router.get('/config', adminAuth, async (req, res) => {
  try {
    const config = await adminStorage.getSystemConfig();
    res.json(config);
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

router.post('/config/:key', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    await adminStorage.updateSystemConfig(key, value, req.admin.id);
    
    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: 'config_update',
      target: 'system_config',
      targetId: null,
      details: { key, value },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Audit logs
router.get('/audit-logs', adminAuth, async (req, res) => {
  try {
    const { adminId, action, target, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (adminId) filters.adminId = parseInt(adminId as string);
    if (action) filters.action = action as string;
    if (target) filters.target = target as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    
    const logs = await adminStorage.getAuditLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Admin logout
router.post('/logout', adminAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await adminStorage.revokeAdminSession(token);
    }
    
    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: 'admin_logout',
      target: 'system',
      targetId: req.admin.id,
      details: {},
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// User metrics with comprehensive point system
router.get('/user-metrics', adminAuth, async (req, res) => {
  try {
    const { search, sortBy, sortOrder, minCosmicScore, maxCosmicScore } = req.query;
    
    console.log('User metrics request:', { search, sortBy, sortOrder, minCosmicScore, maxCosmicScore });
    
    const users = await adminStorage.getUsersWithMetrics(
      search as string,
      minCosmicScore ? parseInt(minCosmicScore as string) : undefined,
      maxCosmicScore ? parseInt(maxCosmicScore as string) : undefined
    );
    
    // Sort results based on sortBy and sortOrder
    if (sortBy && users.length > 0) {
      users.sort((a, b) => {
        let aVal = a[sortBy as keyof typeof a];
        let bVal = b[sortBy as keyof typeof b];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }
    
    console.log(`Returning ${users.length} user metrics`);
    res.json(users);
  } catch (error) {
    console.error('User metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch user metrics' });
  }
});

// Legacy route for compatibility
router.get('/users/metrics', adminAuth, async (req, res) => {
  try {
    const { search, minCosmicScore, maxCosmicScore } = req.query;
    const users = await adminStorage.getUsersWithMetrics(
      search as string,
      minCosmicScore ? parseInt(minCosmicScore as string) : undefined,
      maxCosmicScore ? parseInt(maxCosmicScore as string) : undefined
    );
    res.json(users);
  } catch (error) {
    console.error('User metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch user metrics' });
  }
});

// Individual user cosmic score
router.get('/users/:id/cosmic-score', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const points = await adminStorage.calculateUserPoints(userId);
    const cosmicScore = await adminStorage.calculateCosmicScore(userId);
    
    // Get user data directly from database
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user) {
      const auraRating = parseFloat(user.auraRating || '4.0');
      const amplifier = await adminStorage.getAuraAmplifier(auraRating);
      
      res.json({
        userId,
        username: user.username,
        name: user.name,
        totalPoints: points,
        auraRating,
        auraAmplifier: amplifier,
        cosmicScore
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Cosmic score error:', error);
    res.status(500).json({ error: 'Failed to calculate cosmic score' });
  }
});

// URL Analytics endpoints
router.get('/url-analytics', adminAuth, async (req, res) => {
  try {
    const urlAnalytics = await adminStorage.getUrlAnalytics();
    res.json(urlAnalytics);
  } catch (error) {
    console.error('Error fetching URL analytics:', error);
    res.status(500).json({ error: 'Failed to fetch URL analytics' });
  }
});

router.post('/url-mapping', adminAuth, async (req, res) => {
  try {
    const { originalUrl, newUrl, discountCode } = req.body;
    const adminId = req.admin?.id;

    if (!originalUrl || !newUrl) {
      return res.status(400).json({ error: 'Original URL and new URL are required' });
    }

    await adminStorage.updateUrlMapping(originalUrl, newUrl, discountCode, adminId);
    res.json({ success: true, message: 'URL mapping updated successfully' });
  } catch (error) {
    console.error('Error updating URL mapping:', error);
    res.status(500).json({ error: 'Failed to update URL mapping' });
  }
});

router.get('/url-mappings', adminAuth, async (req, res) => {
  try {
    const mappings = await adminStorage.getUrlMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching URL mappings:', error);
    res.status(500).json({ error: 'Failed to fetch URL mappings' });
  }
});

// Post Analytics endpoint
router.get('/post-analytics', adminAuth, async (req: Request, res: Response) => {
  try {
    const { search, sortBy } = req.query;
    const posts = await adminStorage.getPostAnalytics();
    
    let filteredPosts = posts;
    if (search && typeof search === 'string') {
      filteredPosts = posts.filter(post => 
        post.primaryDescription?.toLowerCase().includes(search.toLowerCase()) ||
        post.user?.username.toLowerCase().includes(search.toLowerCase()) ||
        post.hashtags?.some(tag => tag.name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    console.log(`Returning ${filteredPosts.length} post analytics`);
    res.json(filteredPosts);
  } catch (error) {
    console.error('Error fetching post analytics:', error);
    res.status(500).json({ error: 'Failed to fetch post analytics' });
  }
});

// Promote post endpoint
router.post('/posts/:postId/promote', adminAuth, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { hashtag, views } = req.body;
    const admin = req.admin;
    
    await adminStorage.promotePost(parseInt(postId), hashtag, parseInt(views), admin.id);
    
    // Log the action
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'promote_post',
      target: `post:${postId}`,
      details: { hashtag, views }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error promoting post:', error);
    res.status(500).json({ error: 'Failed to promote post' });
  }
});

// User Management Routes
router.get('/users/search', adminAuth, async (req: Request, res: Response) => {
  try {
    const { q: searchTerm } = req.query;
    const admin = req.admin;
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ error: 'Search term required' });
    }

    const searchResults = await adminStorage.searchUsers(searchTerm);
    
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'search_users',
      target: 'users',
      details: { searchTerm }
    });
    
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.delete('/users/:userId', adminAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const admin = req.admin;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user details before deletion for logging
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user using the storage method
    await storage.deleteUser(userId);
    
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'delete_user',
      target: `user:${userId}`,
      details: { username: user.username, name: user.name }
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/users/:userId/suspend', adminAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const admin = req.admin;
    const { reason, duration } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user details before suspension
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Suspend user (ban with duration)
    const suspensionEndDate = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : undefined;
    await adminStorage.banUser(userId, admin.id, reason || 'Administrative suspension', suspensionEndDate);
    
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'suspend_user',
      target: `user:${userId}`,
      details: { username: user.username, reason, duration: duration || 'indefinite' }
    });
    
    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

router.post('/users/:userId/unsuspend', adminAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const admin = req.admin;
    const { reason } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user details before unsuspension
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create unsuspend moderation action
    await adminStorage.createModerationAction({
      moderatorId: admin.id,
      contentType: 'user',
      contentId: userId,
      action: 'unban',
      reason: reason || 'Administrative unsuspension'
    });
    
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'unsuspend_user',
      target: `user:${userId}`,
      details: { username: user.username, reason }
    });
    
    res.json({ message: 'User unsuspended successfully' });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

router.get('/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    const { page = 1, limit = 50, search = '', filter = 'all' } = req.query;
    
    const filters: any = {};
    if (filter === 'active') filters.isActive = true;
    if (filter === 'banned') filters.isBanned = true;
    
    const users = await adminStorage.searchUsers(search as string, filters);
    
    // Add ban status to each user
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const posts = await storage.getPostsByUserId ? await storage.getPostsByUserId(user.id) : [];
      const lists = await storage.getListsByUserId ? await storage.getListsByUserId(user.id) : [];
      
      // Check if user is banned using suspend/ban actions
      const moderationHistory = await adminStorage.getUserModerationHistory(user.id);
      const latestSuspend = moderationHistory
        .filter(action => action.action === 'ban' || action.action === 'suspend')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const latestUnsuspend = moderationHistory
        .filter(action => action.action === 'unban' || action.action === 'unsuspend')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const isBanned = latestSuspend && (!latestUnsuspend || new Date(latestSuspend.createdAt) > new Date(latestUnsuspend.createdAt));
      
      // Debug logging for user status
      if (user.id === 11) {
        console.log(`User ${user.username} status check:`, {
          moderationHistory: moderationHistory.length,
          latestSuspend: latestSuspend?.action,
          latestUnsuspend: latestUnsuspend?.action,
          isBanned
        });
      }
      
      return {
        ...user,
        postCount: posts.length,
        listCount: lists.length,
        isActive: !isBanned,
        isBanned: !!isBanned
      };
    }));
    
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'list_users',
      target: 'users',
      details: { page, limit, search, filter }
    });
    
    res.json(usersWithStatus);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

export default router;