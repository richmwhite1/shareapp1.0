/**
 * Admin Section Foundation
 * Core infrastructure for admin panel development
 */

// Admin Authentication & Authorization
export interface AdminUser {
  id: number;
  username: string;
  role: 'super_admin' | 'moderator' | 'content_admin';
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

// Admin Dashboard Metrics
export interface AdminMetrics {
  totalUsers: number;
  totalPosts: number;
  totalLists: number;
  activeUsers24h: number;
  flaggedContent: number;
  pendingReports: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

// Content Moderation Interface
export interface ModerationAction {
  id: number;
  contentType: 'post' | 'user' | 'comment' | 'list';
  contentId: number;
  action: 'approve' | 'reject' | 'flag' | 'ban' | 'warn';
  reason: string;
  moderatorId: number;
  createdAt: Date;
}

// Audit Log Structure
export interface AuditLog {
  id: number;
  adminId: number;
  action: string;
  target: string;
  targetId: number;
  details: Record<string, any>;
  ipAddress: string;
  timestamp: Date;
}

// System Configuration
export interface SystemConfig {
  maxPostsPerDay: number;
  maxListsPerUser: number;
  autoModerationEnabled: boolean;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  privacySettingsDefaults: {
    defaultPostPrivacy: 'public' | 'connections' | 'private';
    defaultListPrivacy: 'public' | 'connections' | 'private';
  };
}

// Data Export/Import Interfaces
export interface DataExport {
  users: any[];
  posts: any[];
  lists: any[];
  timestamp: Date;
  exportedBy: number;
}

export interface BulkOperation {
  id: string;
  type: 'user_import' | 'content_migration' | 'data_cleanup';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

// Admin API Response Types
export interface AdminResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}