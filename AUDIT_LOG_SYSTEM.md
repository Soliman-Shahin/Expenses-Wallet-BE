# Audit Log System Documentation

## Overview

The Audit Log System provides comprehensive tracking of all security-sensitive operations in the Expenses-Wallet backend. It automatically logs user actions, permission changes, authentication events, and resource modifications.

## Features

- ✅ **Automatic Logging** - Middleware-based logging for all sensitive endpoints
- ✅ **Granular Actions** - 40+ predefined audit actions covering all operations
- ✅ **Severity Levels** - INFO, WARNING, ERROR, CRITICAL
- ✅ **Rich Metadata** - IP address, user agent, request details, and change tracking
- ✅ **Query API** - Powerful filtering and search capabilities
- ✅ **Statistics** - Aggregated metrics and analytics
- ✅ **Cleanup** - Automatic deletion of old logs

## Architecture

### Components

1. **Model** (`audit-log.model.ts`) - MongoDB schema with optimized indexes
2. **Service** (`audit-log.service.ts`) - Business logic for logging and queries
3. **Middleware** (`audit.middleware.ts`) - Automatic request logging
4. **Controller** (`audit-log.controller.ts`) - HTTP request handlers
5. **Routes** (`audit-log.route.ts`) - API endpoints

## Audit Actions

### User Management
- `user:created` - New user created
- `user:updated` - User profile updated
- `user:deleted` - User soft deleted
- `user:restored` - User restored from deletion
- `user:login` - Successful login
- `user:logout` - User logout
- `user:login_failed` - Failed login attempt

### Role Management
- `role:changed` - User role modified
- `role:assigned` - Role assigned to user

### Permission Management
- `permission:granted` - Permission granted
- `permission:revoked` - Permission revoked
- `custom_permission:added` - Custom permission added
- `custom_permission:removed` - Custom permission removed

### Plan Management
- `plan:created` - New plan created
- `plan:updated` - Plan modified
- `plan:deleted` - Plan deleted
- `plan:assigned` - Plan assigned to user
- `plan:upgraded` - User upgraded plan
- `plan:downgraded` - User downgraded plan
- `plan:expired` - Plan expired

### Resource Management
- `expense:created` - Expense created
- `expense:updated` - Expense modified
- `expense:deleted` - Expense deleted
- `expense:restored` - Expense restored
- `category:created` - Category created
- `category:updated` - Category modified
- `category:deleted` - Category deleted
- `category:restored` - Category restored

### Security Events
- `password:changed` - Password changed
- `password:reset_requested` - Password reset requested
- `password:reset_completed` - Password reset completed
- `email:verified` - Email verified
- `two_factor:enabled` - 2FA enabled
- `two_factor:disabled` - 2FA disabled

### Access Control
- `access:denied` - Access denied to resource
- `permission:denied` - Permission denied
- `rate_limit:exceeded` - Rate limit exceeded

## Usage

### Automatic Logging with Middleware

```typescript
import { auditRequest, auditUserManagement, auditResourceCreation } from '../middleware/audit.middleware';
import { AuditAction } from '../models/audit-log.model';

// Log any request
router.post('/action', 
  verifyAccessToken,
  auditRequest(AuditAction.USER_UPDATED),
  controller.action
);

// Log user management actions
router.put('/users/:id',
  verifyAccessToken,
  requireAdmin,
  auditUserManagement(AuditAction.USER_UPDATED),
  adminController.updateUser
);

// Log resource creation
router.post('/expenses',
  verifyAccessToken,
  auditResourceCreation('expense', AuditAction.EXPENSE_CREATED),
  expenseController.create
);
```

### Manual Logging

```typescript
import { auditLogService } from '../services/audit-log.service';
import { AuditAction, AuditSeverity } from '../models/audit-log.model';

// Log a user action
await auditLogService.logUserAction({
  actorId: userId,
  actorRole: UserRole.Admin,
  actorEmail: 'admin@example.com',
  action: AuditAction.ROLE_CHANGED,
  targetUserId: targetUser._id,
  changes: {
    role: { before: 'user', after: 'admin' }
  },
  req
});

// Log a security event
await auditLogService.logSecurityEvent({
  actorId: userId,
  action: AuditAction.USER_LOGIN_FAILED,
  success: false,
  errorMessage: 'Invalid credentials',
  req
});

// Log permission denial
await auditLogService.logPermissionDenied({
  actorId: userId,
  actorRole: UserRole.User,
  action: 'export_expenses',
  requiredPermission: Permission.EXPENSE_EXPORT,
  currentPlan: 'free',
  req
});
```

## API Endpoints

All endpoints require authentication and admin privileges.

### GET /api/v1/audit-logs

Get audit logs with filters.

**Query Parameters:**
- `actorId` - Filter by actor user ID
- `targetUserId` - Filter by target user ID
- `action` - Filter by action (can be array)
- `severity` - Filter by severity (can be array)
- `success` - Filter by success status (true/false)
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `limit` - Number of results (default: 50)
- `skip` - Number of results to skip (pagination)
- `sortBy` - Sort field (default: timestamp)
- `sortOrder` - Sort order (asc/desc, default: desc)

**Example:**
```bash
GET /api/v1/audit-logs?action=user:login&success=false&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 150
  }
}
```

### GET /api/v1/audit-logs/user/:userId

Get all audit logs for a specific user.

**Example:**
```bash
GET /api/v1/audit-logs/user/507f1f77bcf86cd799439011?limit=50
```

### GET /api/v1/audit-logs/security/recent

Get recent security events (failed logins, access denials, etc.).

**Query Parameters:**
- `limit` - Number of results (default: 100)

**Example:**
```bash
GET /api/v1/audit-logs/security/recent?limit=50
```

### GET /api/v1/audit-logs/stats

Get audit log statistics for a time period.

**Query Parameters (Required):**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Example:**
```bash
GET /api/v1/audit-logs/stats?startDate=2026-01-01&endDate=2026-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 5420,
    "byAction": {
      "user:login": 1200,
      "expense:created": 850,
      ...
    },
    "bySeverity": {
      "info": 4500,
      "warning": 800,
      "error": 100,
      "critical": 20
    },
    "successRate": 95.5,
    "topActors": [
      { "actorId": "507f...", "count": 450 },
      ...
    ]
  }
}
```

### DELETE /api/v1/audit-logs/cleanup (SuperAdmin Only)

Delete old audit logs.

**Query Parameters (Required):**
- `olderThanDays` - Delete logs older than this many days

**Example:**
```bash
DELETE /api/v1/audit-logs/cleanup?olderThanDays=90
```

## Database Schema

```typescript
{
  actorId: String,           // User who performed the action
  actorRole: UserRole,       // Role at time of action
  actorEmail: String,        // Email for quick reference
  
  action: AuditAction,       // The action performed
  severity: AuditSeverity,   // Severity level
  
  targetUserId: String,      // Target user (if applicable)
  targetRole: UserRole,      // Target user role
  targetResourceType: String,// Resource type (expense, category, etc.)
  targetResourceId: String,  // Resource ID
  
  changes: Object,           // Before/after values
  metadata: Object,          // Additional context
  
  ipAddress: String,         // Client IP
  userAgent: String,         // Browser/client info
  requestPath: String,       // API endpoint
  requestMethod: String,     // HTTP method
  
  success: Boolean,          // Whether action succeeded
  errorMessage: String,      // Error if failed
  
  timestamp: Date,           // When it happened
  expiresAt: Date           // TTL for auto-deletion (optional)
}
```

## Indexes

Optimized indexes for common queries:

- `actorId + timestamp` - User activity timeline
- `targetUserId + timestamp` - Actions affecting a user
- `action + timestamp` - Action-specific queries
- `severity + timestamp` - Security monitoring
- `success + timestamp` - Error tracking

## Best Practices

### 1. Use Middleware for Routes

Prefer middleware-based logging over manual logging:

```typescript
// ✅ Good
router.post('/users', auditUserManagement(AuditAction.USER_CREATED), controller.create);

// ❌ Avoid (unless you need custom logic)
async create(req, res) {
  await auditLogService.log({ ... });
  // ...
}
```

### 2. Include Meaningful Changes

Track what actually changed:

```typescript
changes: {
  role: { before: 'user', after: 'admin' },
  plan: { before: 'free', after: 'pro' }
}
```

### 3. Set Appropriate Severity

- **INFO** - Normal operations
- **WARNING** - Important changes, security events
- **ERROR** - Failed operations
- **CRITICAL** - Security breaches, data loss

### 4. Regular Cleanup

Schedule periodic cleanup to prevent database bloat:

```typescript
// Run monthly via cron job
DELETE /api/v1/audit-logs/cleanup?olderThanDays=90
```

### 5. Monitor Security Events

Set up alerts for:
- Multiple failed login attempts
- Permission denials
- Rate limit violations
- Critical severity events

## Performance Considerations

- Logs are written **asynchronously** to avoid blocking responses
- Compound indexes optimize common query patterns
- TTL indexes can auto-delete old logs (optional)
- Aggregation pipeline used for statistics

## Security

- All audit log endpoints require **Admin** privileges
- Cleanup endpoint requires **SuperAdmin** privileges
- Logs are **immutable** - no update/delete operations
- IP addresses and user agents are captured for forensics

## Future Enhancements

- [ ] Real-time alerts via WebSocket
- [ ] Export to external SIEM systems
- [ ] Machine learning for anomaly detection
- [ ] Compliance reports (GDPR, SOC2, etc.)
- [ ] Retention policies per action type

## Example Queries

### Find all failed login attempts in the last 24 hours

```bash
GET /api/v1/audit-logs?action=user:login_failed&startDate=2026-07-23T00:00:00Z&endDate=2026-07-24T00:00:00Z
```

### Get all actions by a specific user

```bash
GET /api/v1/audit-logs?actorId=507f1f77bcf86cd799439011&limit=100
```

### Find all critical security events

```bash
GET /api/v1/audit-logs?severity=critical&sortBy=timestamp&sortOrder=desc
```

### Track changes to a specific user

```bash
GET /api/v1/audit-logs?targetUserId=507f1f77bcf86cd799439011
```

## Support

For questions or issues, contact the development team or check the main project documentation.
