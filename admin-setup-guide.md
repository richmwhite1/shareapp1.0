# Admin Dashboard Setup & Testing Guide

## 1. Database Schema Setup

First, we need to push the admin schema to the database:

```bash
npm run db:push
```

This will create the admin tables:
- admin_users
- admin_sessions
- audit_logs
- moderation_actions
- system_config
- bulk_operations
- content_review_queue

## 2. Create Initial Admin User

Since we need a bootstrap admin user, we'll create one programmatically:

### Option A: Direct Database Insert (Recommended)
```sql
INSERT INTO admin_users (username, password, email, role, permissions, is_active)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
  'admin@share.com',
  'super_admin',
  ARRAY['user_management', 'content_moderation', 'system_config', 'admin_management', 'data_export'],
  true
);
```

### Option B: API Registration Endpoint
We can add a one-time setup endpoint for creating the first admin.

## 3. Access the Admin Dashboard

1. Navigate to: `http://localhost:5000/admin`
2. Login with credentials:
   - Username: `admin`
   - Password: `password`

## 4. Testing Workflow

### Phase 1: Content Generation
- Create multiple user accounts
- Generate posts with different privacy levels
- Create collaborative lists
- Add hashtags and connections

### Phase 2: Flag Content for Testing
- Report posts to populate the moderation queue
- Create content violations to test review system
- Generate user behavior that needs moderation

### Phase 3: Admin Testing
- Login to admin dashboard
- Test user search and management
- Process moderation queue items
- Review analytics and metrics
- Test bulk operations

## 5. Key Testing Areas

### User Management
- Search users by username/name
- Ban/unban users with reasons
- View user moderation history
- Check user growth analytics

### Content Moderation
- Review flagged content in queue
- Approve/remove posts with reasons
- Track moderation actions
- Monitor content statistics

### System Administration
- View dashboard metrics
- Update system configuration
- Export user/content data
- Monitor audit logs

## 6. Debug Points to Watch

### Backend Issues
- Check server logs for admin route errors
- Verify database connections
- Monitor authentication token handling
- Watch for permission validation

### Frontend Issues
- Admin dashboard loading states
- API request/response handling
- Authentication flow completion
- Real-time metric updates

## 7. Common Issues & Solutions

### "Admin authentication required"
- Verify admin user exists in database
- Check session token validity
- Confirm role permissions

### "Failed to fetch dashboard metrics"
- Check storage enterprise integration
- Verify database query execution
- Monitor API endpoint responses

### Empty review queue
- Create test flagged content
- Verify flag insertion logic
- Check content privacy filtering