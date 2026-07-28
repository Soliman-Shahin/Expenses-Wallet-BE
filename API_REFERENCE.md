# API Reference - Roles & Permissions System

Complete API documentation for all permission-related endpoints.

**Base URL:** `http://localhost:3000/v1`  
**Authentication:** All endpoints require `Authorization: Bearer {token}` header

---

## 📑 Table of Contents

1. [Audit Logs API](#audit-logs-api)
2. [Cache Management API](#cache-management-api)
3. [Permission Scopes API](#permission-scopes-api)
4. [Rate Limits API](#rate-limits-api)
5. [Temporary Permissions API](#temporary-permissions-api)
6. [Permission Matrix API](#permission-matrix-api)
7. [Common Response Formats](#common-response-formats)
8. [Error Codes](#error-codes)

---

## 🔍 Audit Logs API

### Get Audit Logs

```http
GET /v1/audit-logs
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `actorId` | string | Filter by actor user ID | `507f1f77bcf86cd799439011` |
| `targetUserId` | string | Filter by target user ID | `507f1f77bcf86cd799439012` |
| `action` | string | Filter by action | `USER_ROLE_CHANGED` |
| `severity` | string | Filter by severity | `WARNING` |
| `success` | boolean | Filter by success status | `true` |
| `startDate` | ISO date | Start date filter | `2026-01-01T00:00:00Z` |
| `endDate` | ISO date | End date filter | `2026-12-31T23:59:59Z` |
| `limit` | number | Results per page | `50` |
| `skip` | number | Skip results | `0` |
| `sortBy` | string | Sort field | `createdAt` |
| `sortOrder` | string | Sort order | `desc` |

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "action": "USER_ROLE_CHANGED",
        "actorId": "507f1f77bcf86cd799439012",
        "targetUserId": "507f1f77bcf86cd799439013",
        "severity": "WARNING",
        "success": true,
        "metadata": {
          "oldRole": "user",
          "newRole": "admin"
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2026-07-25T12:00:00.000Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "skip": 0
  }
}
```

---

### Get User Audit Logs

```http
GET /v1/audit-logs/user/:userId
```

**Access:** Admin

**Parameters:**
- `userId` (path): User ID

**Query Parameters:**
- Same as Get Audit Logs

**Response:** Same format as Get Audit Logs

---

### Get Recent Security Events

```http
GET /v1/audit-logs/security/recent
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Number of events |

**Response:**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "...",
        "action": "LOGIN_FAILED",
        "severity": "ERROR",
        "actorId": null,
        "metadata": {
          "email": "user@example.com",
          "reason": "Invalid password"
        },
        "ipAddress": "192.168.1.1",
        "createdAt": "2026-07-25T12:00:00.000Z"
      }
    ],
    "count": 15
  }
}
```

---

### Get Audit Log Statistics

```http
GET /v1/audit-logs/stats
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | ISO date | Yes | Start date |
| `endDate` | ISO date | Yes | End date |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalLogs": 1250,
    "byAction": {
      "USER_LOGIN": 450,
      "USER_ROLE_CHANGED": 25,
      "PERMISSION_GRANTED": 100
    },
    "bySeverity": {
      "INFO": 1000,
      "WARNING": 150,
      "ERROR": 80,
      "CRITICAL": 20
    },
    "bySuccess": {
      "true": 1100,
      "false": 150
    },
    "topActors": [
      {
        "actorId": "507f1f77bcf86cd799439011",
        "count": 250
      }
    ],
    "securityEvents": 180,
    "failedAttempts": 150
  }
}
```

---

### Cleanup Old Audit Logs

```http
DELETE /v1/audit-logs/cleanup
```

**Access:** SuperAdmin

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `olderThanDays` | number | Yes | Delete logs older than X days |

**Response:**

```json
{
  "success": true,
  "data": {
    "deletedCount": 5000,
    "olderThanDays": 90
  }
}
```

---

## 💾 Cache Management API

### Get Cache Statistics

```http
GET /v1/cache/stats
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "keys": 150,
    "hits": 9500,
    "misses": 500,
    "hitRate": 95.0,
    "ksize": 150,
    "vsize": 75000
  }
}
```

---

### Invalidate User Cache

```http
DELETE /v1/cache/user/:userId
```

**Access:** Admin

**Parameters:**
- `userId` (path): User ID to invalidate

**Response:**

```json
{
  "success": true,
  "message": "Cache invalidated for user 507f1f77bcf86cd799439011"
}
```

---

### Bulk Invalidate Users

```http
POST /v1/cache/invalidate-users
```

**Access:** Admin

**Request Body:**

```json
{
  "userIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "invalidated": 2,
    "userIds": [...]
  }
}
```

---

### Invalidate Plan Cache

```http
DELETE /v1/cache/plan/:planSlug
```

**Access:** Admin

**Parameters:**
- `planSlug` (path): Plan slug (free, basic, pro, enterprise)

**Response:**

```json
{
  "success": true,
  "message": "Cache invalidated for plan 'pro' and all users on this plan",
  "data": {
    "invalidatedUsers": 150
  }
}
```

---

### Flush All Cache

```http
DELETE /v1/cache/flush
```

**Access:** SuperAdmin

**Response:**

```json
{
  "success": true,
  "message": "All cache flushed successfully"
}
```

---

### Warm Up Cache

```http
POST /v1/cache/warmup
```

**Access:** SuperAdmin

**Request Body:**

```json
{
  "userIds": ["507f1f77bcf86cd799439011"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "warmedUp": 1,
    "failed": 0
  }
}
```

---

## 🎯 Permission Scopes API

### Get My Scopes

```http
GET /v1/scopes/me
```

**Access:** Authenticated User

**Response:**

```json
{
  "success": true,
  "data": {
    "scopes": [
      "expenses:*",
      "categories:*",
      "reports:basic"
    ],
    "permissions": [
      "expense:create",
      "expense:read",
      "expense:update",
      "expense:delete",
      "expense:export"
    ]
  }
}
```

---

### Check Scope

```http
GET /v1/scopes/check/:scope
```

**Access:** Authenticated User

**Parameters:**
- `scope` (path): Scope to check (e.g., `expenses:*`)

**Response:**

```json
{
  "success": true,
  "data": {
    "hasScope": true,
    "scope": "expenses:*",
    "requiredPermissions": [
      "expense:create",
      "expense:read",
      "expense:update",
      "expense:delete",
      "expense:export"
    ],
    "missingPermissions": []
  }
}
```

---

### Get Missing Scopes

```http
POST /v1/scopes/missing
```

**Access:** Authenticated User

**Request Body:**

```json
{
  "requiredScopes": ["expenses:*", "reports:*"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hasAllScopes": false,
    "missingScopes": ["reports:*"],
    "missingPermissions": [
      "report:view",
      "report:advanced"
    ]
  }
}
```

---

### Get All Scopes

```http
GET /v1/scopes
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "scopes": [
      {
        "scope": "expenses:*",
        "permissions": ["expense:create", "expense:read", ...]
      }
    ]
  }
}
```

---

## ⏱️ Rate Limits API

### Get My Rate Limits

```http
GET /v1/rate-limits/me
```

**Access:** Authenticated User

**Response:**

```json
{
  "success": true,
  "data": {
    "role": "user",
    "windowMs": 900000,
    "max": 100,
    "current": 45,
    "remaining": 55,
    "resetAt": "2026-07-25T12:15:00.000Z"
  }
}
```

---

### Get Rate Limit Status

```http
GET /v1/rate-limits/status
```

**Access:** Authenticated User

**Response:**

```json
{
  "success": true,
  "data": {
    "general": {
      "limit": 100,
      "remaining": 55,
      "resetAt": "2026-07-25T12:15:00.000Z"
    },
    "strict": {
      "limit": 10,
      "remaining": 8,
      "resetAt": "2026-07-25T12:15:00.000Z"
    }
  }
}
```

---

## ⏰ Temporary Permissions API

### Grant Temporary Permission

```http
POST /v1/temporary-permissions
```

**Access:** Admin

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "permission": "expense:export",
  "startDate": "2026-07-25T00:00:00.000Z",
  "endDate": "2026-08-01T23:59:59.000Z",
  "reason": "7-day export trial"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "userId": "507f1f77bcf86cd799439011",
    "permission": "expense:export",
    "startDate": "2026-07-25T00:00:00.000Z",
    "endDate": "2026-08-01T23:59:59.000Z",
    "reason": "7-day export trial",
    "grantedBy": "507f1f77bcf86cd799439012",
    "isActive": true,
    "createdAt": "2026-07-25T12:00:00.000Z"
  }
}
```

---

### Revoke Temporary Permission

```http
DELETE /v1/temporary-permissions/:id
```

**Access:** Admin

**Parameters:**
- `id` (path): Temporary permission ID

**Response:**

```json
{
  "success": true,
  "message": "Temporary permission revoked successfully"
}
```

---

### Extend Temporary Permission

```http
PATCH /v1/temporary-permissions/:id/extend
```

**Access:** Admin

**Parameters:**
- `id` (path): Temporary permission ID

**Request Body:**

```json
{
  "newEndDate": "2026-08-15T23:59:59.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "endDate": "2026-08-15T23:59:59.000Z",
    "updatedAt": "2026-07-25T12:00:00.000Z"
  }
}
```

---

### Get My Temporary Permissions

```http
GET /v1/temporary-permissions/me
```

**Access:** Authenticated User

**Response:**

```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "permission": "expense:export",
        "startDate": "2026-07-25T00:00:00.000Z",
        "endDate": "2026-08-01T23:59:59.000Z",
        "isActive": true,
        "daysRemaining": 7
      }
    ],
    "count": 1
  }
}
```

---

### Get User Temporary Permissions

```http
GET /v1/temporary-permissions/user/:userId
```

**Access:** Admin

**Parameters:**
- `userId` (path): User ID

**Response:** Same format as Get My Temporary Permissions

---

### Get Expiring Soon

```http
GET /v1/temporary-permissions/expiring-soon
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 7 | Days threshold |

**Response:**

```json
{
  "success": true,
  "data": {
    "permissions": [...],
    "count": 15
  }
}
```

---

### Get Statistics

```http
GET /v1/temporary-permissions/stats
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 100,
    "expired": 45,
    "expiringSoon": 15,
    "byPermission": {
      "expense:export": 50,
      "report:advanced": 30
    }
  }
}
```

---

### Process Expired Permissions

```http
POST /v1/temporary-permissions/process-expired
```

**Access:** SuperAdmin

**Response:**

```json
{
  "success": true,
  "data": {
    "processed": 25,
    "deactivated": 25
  }
}
```

---

## 📊 Permission Matrix API

### Get Complete Matrix

```http
GET /v1/permissions/matrix
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "permission": "category:create",
        "group": "categories",
        "description": "Create new expense categories",
        "plans": {
          "free": false,
          "basic": true,
          "pro": true,
          "enterprise": true
        },
        "roles": {
          "user": true,
          "moderator": false,
          "admin": false,
          "superadmin": true
        },
        "scopes": ["categories:*", "categories:write"]
      }
    ],
    "plans": [...],
    "roles": [...],
    "scopes": [...],
    "metadata": {
      "totalPermissions": 27,
      "totalPlans": 4,
      "totalRoles": 4,
      "totalScopes": 15,
      "generatedAt": "2026-07-25T12:00:00.000Z"
    }
  }
}
```

---

### Get Summary

```http
GET /v1/permissions/summary
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "totalPermissions": 27,
    "totalPlans": 4,
    "totalRoles": 4,
    "totalScopes": 15,
    "permissionsByGroup": {
      "categories": 4,
      "expenses": 5,
      "reports": 2
    },
    "plans": [...],
    "roles": [...],
    "mostCommonPermissions": [...],
    "leastCommonPermissions": [...]
  }
}
```

---

### Export Matrix

```http
GET /v1/permissions/export?format={format}
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `format` | string | json | json, csv, markdown |

**Response:** File download with appropriate content-type

---

### Compare Plans

```http
GET /v1/permissions/compare/plans?plan1={slug1}&plan2={slug2}
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan1` | string | Yes | First plan slug |
| `plan2` | string | Yes | Second plan slug |

**Response:**

```json
{
  "success": true,
  "data": {
    "entity1": "Basic Plan",
    "entity2": "Pro Plan",
    "type": "plan",
    "permissions1": [...],
    "permissions2": [...],
    "common": [...],
    "onlyIn1": [],
    "onlyIn2": [...],
    "similarity": 75.5
  }
}
```

---

### Compare Roles

```http
GET /v1/permissions/compare/roles?role1={role1}&role2={role2}
```

**Access:** Admin

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role1` | string | Yes | First role |
| `role2` | string | Yes | Second role |

**Response:** Same format as Compare Plans

---

### Get Visualization Data

```http
GET /v1/permissions/visualization
```

**Access:** Admin

**Response:**

```json
{
  "success": true,
  "data": {
    "permissionsByGroup": {
      "categories": 4,
      "expenses": 5
    },
    "permissionsByPlan": [...],
    "permissionsByRole": [...],
    "coverageMatrix": [
      {
        "plan": "Free Plan",
        "coverage": {
          "categories": 100,
          "expenses": 80,
          "reports": 50
        }
      }
    ]
  }
}
```

---

### Get Plan Permissions

```http
GET /v1/permissions/plan/:slug
```

**Access:** Admin

**Parameters:**
- `slug` (path): Plan slug

**Response:**

```json
{
  "success": true,
  "data": {
    "plan": {
      "slug": "pro",
      "name": "Pro Plan"
    },
    "permissions": [...],
    "count": 20
  }
}
```

---

### Get Role Permissions

```http
GET /v1/permissions/role/:role
```

**Access:** Admin

**Parameters:**
- `role` (path): Role name

**Response:**

```json
{
  "success": true,
  "data": {
    "role": "admin",
    "permissions": [...],
    "count": 6
  }
}
```

---

## 📋 Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

---

## ⚠️ Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `PLAN_REQUIRED` | 403 | Requires plan upgrade |
| `PLAN_EXPIRED` | 403 | Subscription expired |
| `PLAN_LIMIT_EXCEEDED` | 403 | Plan limit reached |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📝 Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All IDs are MongoDB ObjectIds (24 hex characters)
3. Rate limits are enforced per role
4. Cache TTL is 5 minutes by default
5. Audit logs are retained for 90 days

---

**Version:** 1.0.0  
**Last Updated:** July 25, 2026
