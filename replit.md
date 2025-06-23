# Share Platform - Social Media & List Management Application

## Overview

Share is a comprehensive social media platform that combines traditional social networking with curated list management. Users can create various types of lists (public, private, or connections-only), share posts with different privacy levels, and engage through likes, comments, and hashtag systems. The platform features a sophisticated three-tier privacy system, collaborative list management, and a comprehensive admin dashboard for content moderation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack React Query for server state
- **Routing**: React Router for client-side navigation
- **Styling**: Tailwind CSS with custom component variants

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **File Upload**: Multer middleware for image handling

### Database Architecture
- **Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle migrations
- **Connection**: Neon HTTP driver for serverless compatibility

## Key Components

### User Management System
- User registration and authentication with JWT tokens
- Profile management with privacy controls
- Friend request and connection system
- User search and discovery features

### List Management System
- Three privacy levels: Public, Connections, Private
- Collaborative list features with role-based access
- List invitation and access request workflows
- List-specific content organization

### Post and Content System
- Rich post creation with multiple media types
- Three-tier privacy system (Public, Connections, Private)
- Hashtag system for content discovery
- Event posts with reminder functionality
- Post engagement tracking (likes, shares, views)

### Social Features
- Friend connections with bidirectional relationships
- Comment system with hashtag and user tagging
- Post sharing and reposting capabilities
- Notification system for user interactions

### Admin Dashboard
- Comprehensive admin panel with role-based permissions
- Content moderation tools and review queue
- User management and ban/unban functionality
- System analytics and audit logging
- Bulk operations for data management

## Data Flow

### User Registration Flow
1. Client submits registration form
2. Server validates input and hashes password
3. User record created in database
4. JWT token generated and returned
5. Client stores token for authenticated requests

### Post Creation Flow
1. User uploads image via multer middleware
2. Post data validated against schema
3. Hashtags extracted and created/linked
4. Privacy level applied based on user settings
5. Post stored with associated metadata
6. Real-time updates sent to relevant feeds

### Privacy System Flow
1. Content privacy level determined (public/connections/private)
2. Viewer's relationship to content owner checked
3. Access permissions calculated based on:
   - Friendship status
   - List collaboration roles
   - Direct tagging in content
4. Filtered content returned to client

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **multer**: File upload handling

### Frontend Dependencies
- **@radix-ui/***: Comprehensive UI component library
- **@tanstack/react-query**: Server state management
- **class-variance-authority**: Component variant handling
- **clsx**: Conditional CSS class utility
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Fast build tool and dev server
- **typescript**: Type safety and development experience
- **drizzle-kit**: Database schema management
- **tsx**: TypeScript execution for Node.js

## Deployment Strategy

### Production Build
1. Frontend built with Vite to static assets
2. Backend compiled with esbuild for Node.js
3. Database schema pushed via Drizzle migrations
4. Environment variables configured for production

### Replit Deployment
- **Autoscale deployment target** for dynamic scaling
- **Port 5000** mapped to external port 80
- **Node.js 20** runtime with PostgreSQL 16 module
- **Development command**: `npm run dev`
- **Production commands**: `npm run build` then `npm run start`

### Environment Configuration
- `DATABASE_URL`: Neon PostgreSQL connection string
- `JWT_SECRET`: Secret key for token signing
- `NODE_ENV`: Environment flag (development/production)

## Changelog
```
Changelog:
- June 23, 2025. Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```