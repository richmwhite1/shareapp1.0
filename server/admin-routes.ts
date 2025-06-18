import { Router } from 'express';
import { adminStorage } from './admin-storage';
import { insertAdminUser, insertModerationAction, insertSystemConfig } from '@shared/admin-schema';
import { z } from 'zod';

const router = Router();

// Admin Authentication Middleware
const requireAdminAuth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const admin = await adminStorage.validateAdminSession(token);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin session' });
  }

  req.admin = admin;
  next();
};

// Permission check middleware
const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    if (!req.admin.permissions.includes(permission) && req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Authentication Routes
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await adminStorage.authenticateAdmin(username, password);
    if (!admin) {
      // Log failed login attempt
      await adminStorage.logAdminAction({
        adminId: 0, // System generated
        action: 'login_failed',
        target: 'admin_auth',
        details: { username, ip: req.ip },
        ipAddress: req.ip
      });
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await adminStorage.createAdminSession(
      admin.id, 
      req.ip, 
      req.get('User-Agent')
    );

    // Log successful login
    await adminStorage.logAdminAction({
      adminId: admin.id,
      action: 'login_success',
      target: 'admin_auth',
      details: { ip: req.ip },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', requireAdminAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await adminStorage.revokeAdminSession(token);
    }

    await adminStorage.logAdminAction({
      adminId: req.admin.id,
      action: 'logout',
      target: 'admin_auth',
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Dashboard & Analytics
router.get('/dashboard/metrics', requireAdminAuth, async (req, res) => {
  try {
    const metrics = await adminStorage.getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

router.get('/analytics/users/:days', requireAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const stats = await adminStorage.getUserGrowthStats(days);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

router.get('/analytics/content/:days', requireAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const stats = await adminStorage.getContentStats(days);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Content analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch content analytics' });
  }
});

router.get('/analytics/moderation/:days', requireAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const stats = await adminStorage.getModerationStats(days);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Moderation analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation analytics' });
  }
});

// Content Moderation
router.get('/moderation/queue', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const filters: any = {};
    
    if (status) filters.status = status as string;
    if (priority) filters.priority = priority as string;
    if (assignedTo) filters.assignedTo = parseInt(assignedTo as string);

    const queue = await adminStorage.getReviewQueue(filters);
    res.json({ success: true, data: queue });
  } catch (error) {
    console.error('Review queue error:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

router.post('/moderation/queue/:itemId/assign', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    await adminStorage.assignReviewItem(itemId, req.admin.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Assign review item error:', error);
    res.status(500).json({ error: 'Failed to assign review item' });
  }
});

router.post('/moderation/queue/:itemId/process', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { action, reason } = req.body;
    
    if (!action || !reason) {
      return res.status(400).json({ error: 'Action and reason required' });
    }

    await adminStorage.processReviewItem(itemId, action, reason, req.admin.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Process review item error:', error);
    res.status(500).json({ error: 'Failed to process review item' });
  }
});

router.get('/moderation/flagged-content', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const { contentType } = req.query;
    const flaggedContent = await adminStorage.getFlaggedContent(contentType as string);
    res.json({ success: true, data: flaggedContent });
  } catch (error) {
    console.error('Flagged content error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged content' });
  }
});

// User Management
router.get('/users/search', requireAdminAuth, requirePermission('user_management'), async (req, res) => {
  try {
    const { q, isActive, isBanned } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';

    const users = await adminStorage.searchUsers(q as string, filters);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.post('/users/:userId/ban', requireAdminAuth, requirePermission('user_management'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { reason, duration } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Ban reason required' });
    }

    const expiresAt = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : undefined;
    await adminStorage.banUser(userId, req.admin.id, reason, expiresAt);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.post('/users/:userId/unban', requireAdminAuth, requirePermission('user_management'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Unban reason required' });
    }

    await adminStorage.unbanUser(userId, req.admin.id, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

router.get('/users/:userId/moderation-history', requireAdminAuth, requirePermission('user_management'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const history = await adminStorage.getUserModerationHistory(userId);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('User moderation history error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation history' });
  }
});

// Content Management
router.post('/content/:contentType/:contentId/remove', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Removal reason required' });
    }

    await adminStorage.removeContent(contentType, parseInt(contentId), req.admin.id, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove content error:', error);
    res.status(500).json({ error: 'Failed to remove content' });
  }
});

router.post('/content/:contentType/:contentId/restore', requireAdminAuth, requirePermission('content_moderation'), async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Restore reason required' });
    }

    await adminStorage.restoreContent(contentType, parseInt(contentId), req.admin.id, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Restore content error:', error);
    res.status(500).json({ error: 'Failed to restore content' });
  }
});

router.get('/content/:contentType/:contentId/moderation-history', requireAdminAuth, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const history = await adminStorage.getModerationHistory(contentType, parseInt(contentId));
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Content moderation history error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation history' });
  }
});

// System Configuration
router.get('/system/config', requireAdminAuth, requirePermission('system_config'), async (req, res) => {
  try {
    const { key } = req.query;
    const config = await adminStorage.getSystemConfig(key as string);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('System config error:', error);
    res.status(500).json({ error: 'Failed to fetch system configuration' });
  }
});

router.put('/system/config/:key', requireAdminAuth, requirePermission('system_config'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Configuration value required' });
    }

    await adminStorage.updateSystemConfig(key, String(value), req.admin.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({ error: 'Failed to update system configuration' });
  }
});

// Admin User Management
router.get('/admins', requireAdminAuth, requirePermission('admin_management'), async (req, res) => {
  try {
    const admins = await adminStorage.listAdminUsers();
    // Remove password hashes from response
    const safeAdmins = admins.map(({ password, ...admin }) => admin);
    res.json({ success: true, data: safeAdmins });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

router.post('/admins', requireAdminAuth, requirePermission('admin_management'), async (req, res) => {
  try {
    const validation = insertAdminUser.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid admin user data', details: validation.error.errors });
    }

    const admin = await adminStorage.createAdminUser(validation.data);
    const { password, ...safeAdmin } = admin;
    
    res.status(201).json({ success: true, data: safeAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

router.get('/admins/:adminId', requireAdminAuth, requirePermission('admin_management'), async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const admin = await adminStorage.getAdminUser(adminId);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const { password, ...safeAdmin } = admin;
    res.json({ success: true, data: safeAdmin });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Failed to fetch admin user' });
  }
});

router.put('/admins/:adminId', requireAdminAuth, requirePermission('admin_management'), async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated this way
    delete updates.id;
    delete updates.createdAt;
    
    await adminStorage.updateAdminUser(adminId, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

router.delete('/admins/:adminId', requireAdminAuth, requirePermission('admin_management'), async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);
    
    // Prevent self-deletion
    if (adminId === req.admin.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    await adminStorage.deleteAdminUser(adminId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin user' });
  }
});

// Audit Logs
router.get('/audit-logs', requireAdminAuth, async (req, res) => {
  try {
    const { adminId, action, target, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (adminId) filters.adminId = parseInt(adminId as string);
    if (action) filters.action = action as string;
    if (target) filters.target = target as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const logs = await adminStorage.getAuditLogs(filters);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Bulk Operations
router.get('/bulk-operations', requireAdminAuth, async (req, res) => {
  try {
    const operations = await adminStorage.getBulkOperations(req.admin.id);
    res.json({ success: true, data: operations });
  } catch (error) {
    console.error('Bulk operations error:', error);
    res.status(500).json({ error: 'Failed to fetch bulk operations' });
  }
});

router.post('/bulk-operations/export-users', requireAdminAuth, requirePermission('data_export'), async (req, res) => {
  try {
    const operationId = await adminStorage.initiateBulkOperation(
      'user_export', 
      req.body.filters || {}, 
      req.admin.id
    );
    
    res.json({ success: true, operationId });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ error: 'Failed to initiate user export' });
  }
});

router.post('/bulk-operations/export-content', requireAdminAuth, requirePermission('data_export'), async (req, res) => {
  try {
    const operationId = await adminStorage.initiateBulkOperation(
      'content_export', 
      req.body.filters || {}, 
      req.admin.id
    );
    
    res.json({ success: true, operationId });
  } catch (error) {
    console.error('Export content error:', error);
    res.status(500).json({ error: 'Failed to initiate content export' });
  }
});

// Health Check
router.get('/health', requireAdminAuth, async (req, res) => {
  try {
    const metrics = await adminStorage.getDashboardMetrics();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      systemHealth: metrics.systemHealth,
      activeAdmin: {
        id: req.admin.id,
        username: req.admin.username,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('Admin health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export { router as adminRoutes };