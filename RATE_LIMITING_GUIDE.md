# Role-Based Rate Limiting Guide

## Overview

The Role-Based Rate Limiting system provides different request limits based on user roles, ensuring fair usage while preventing abuse.

## Rate Limits by Role

### Default Limits (15-minute window)

| Role        | Requests/15min | Requests/minute |
|-------------|----------------|-----------------|
| User        | 100            | ~6.7            |
| Moderator   | 300            | ~20             |
| Admin       | 500            | ~33             |
| SuperAdmin  | 1000           | ~66             |

## Available Rate Limiters

### 1. General Rate Limiter
Applied to most API routes.

```typescript
import { generalRateLimiter } from '../middleware/role-rate-limit.middleware';

router.use(generalRateLimiter);
```

### 2. Strict Rate Limiter
For sensitive operations (auth, password reset, etc.).

**Limits:**
- User: 10 requests/15min
- Moderator: 20 requests/15min
- Admin: 50 requests/15min
- SuperAdmin: 100 requests/15min

```typescript
import { strictRateLimiter } from '../middleware/role-rate-limit.middleware';

router.post('/login', strictRateLimiter, loginController);
router.post('/reset-password', strictRateLimiter, resetController);
```

### 3. Lenient Rate Limiter
For read-only operations.

**Limits:**
- User: 300 requests/15min
- Moderator: 600 requests/15min
- Admin: 1000 requests/15min
- SuperAdmin: 2000 requests/15min

```typescript
import { lenientRateLimiter } from '../middleware/role-rate-limit.middleware';

router.get('/expenses', lenientRateLimiter, getExpenses);
router.get('/categories', lenientRateLimiter, getCategories);
```

### 4. Export Rate Limiter
For data export operations (1-hour window).

**Limits:**
- User: 5 exports/hour
- Moderator: 20 exports/hour
- Admin: 50 exports/hour
- SuperAdmin: 100 exports/hour

```typescript
import { exportRateLimiter } from '../middleware/role-rate-limit.middleware';

router.get('/expenses/export', exportRateLimiter, exportExpenses);
```

## Custom Rate Limiter

Create a custom rate limiter with specific limits:

```typescript
import { createRoleBasedRateLimiter } from '../middleware/role-rate-limit.middleware';
import { UserRole } from '../models/user.model';

const customLimiter = createRoleBasedRateLimiter({
  [UserRole.User]: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
  },
  [UserRole.Admin]: {
    windowMs: 60 * 60 * 1000,
    max: 200,
  },
});

router.post('/custom-endpoint', customLimiter, handler);
```

## Response Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Error Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded. You can make 100 requests per 15 minutes.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 100,
      "windowMs": 900000,
      "retryAfter": 900,
      "retryAt": "2026-07-24T18:00:00.000Z",
      "suggestion": "Please wait 15 minutes before trying again.",
      "userRole": "user"
    }
  }
}
```

## API Endpoints

### Get My Rate Limits
```
GET /api/v1/rate-limits/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "user",
    "limits": {
      "windowMs": 900000,
      "windowMinutes": 15,
      "maxRequests": 100,
      "requestsPerMinute": 6
    }
  }
}
```

### Get Rate Limit Status
```
GET /api/v1/rate-limits/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "user",
    "limit": 100,
    "remaining": 95,
    "reset": "2026-07-24T18:00:00.000Z",
    "windowMs": 900000
  }
}
```

## Usage Examples

### Apply to Entire Router
```typescript
import { generalRateLimiter } from '../middleware/role-rate-limit.middleware';

const router = Router();
router.use(generalRateLimiter);

router.get('/endpoint1', handler1);
router.post('/endpoint2', handler2);
```

### Apply to Specific Routes
```typescript
import { strictRateLimiter, lenientRateLimiter } from '../middleware/role-rate-limit.middleware';

// Strict limit for writes
router.post('/create', strictRateLimiter, createHandler);

// Lenient limit for reads
router.get('/list', lenientRateLimiter, listHandler);
```

### Combine with Other Middleware
```typescript
router.post(
  '/expenses',
  verifyAccessToken,
  attachPlanContext,
  requirePermission(Permission.EXPENSE_CREATE),
  generalRateLimiter,
  createExpense
);
```

## Best Practices

1. **Apply Appropriate Limiters**
   - Use `strictRateLimiter` for authentication and sensitive operations
   - Use `lenientRateLimiter` for read-only operations
   - Use `generalRateLimiter` for standard CRUD operations
   - Use `exportRateLimiter` for resource-intensive exports

2. **Order of Middleware**
   - Apply rate limiting AFTER authentication
   - This allows role-based limits to work correctly
   ```typescript
   router.use(verifyAccessToken);
   router.use(generalRateLimiter);
   ```

3. **Skip Health Checks**
   - Health check endpoints are automatically skipped
   - No rate limiting on `/health` or `/v1/health`

4. **Production Considerations**
   - Use Redis for distributed rate limiting
   - Monitor rate limit violations
   - Adjust limits based on usage patterns

## Monitoring

Track rate limit violations in audit logs:

```typescript
// Automatically logged when rate limit is exceeded
{
  "action": "rate_limit:exceeded",
  "actorId": "user123",
  "actorRole": "user",
  "severity": "warning",
  "metadata": {
    "limit": 100,
    "windowMs": 900000
  }
}
```

## Upgrading Limits

Users can upgrade their plan to get higher rate limits:

- **Free Plan** → User role limits
- **Pro Plan** → Moderator role limits (3x increase)
- **Premium Plan** → Admin role limits (5x increase)

## Testing

Test rate limits in development:

```bash
# Make multiple requests quickly
for i in {1..150}; do
  curl http://localhost:3000/api/v1/expenses
done

# Should see rate limit error after 100 requests
```

## Future Enhancements

- [ ] Redis-based distributed rate limiting
- [ ] Per-endpoint custom limits
- [ ] Dynamic limits based on server load
- [ ] Rate limit analytics dashboard
- [ ] Whitelist/blacklist IP addresses
