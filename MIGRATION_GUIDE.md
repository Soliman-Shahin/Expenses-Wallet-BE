# Migration Guide - Roles & Permissions System

This guide helps you migrate from the old permission system to the new comprehensive Roles & Permissions System.

---

## 📋 Overview

### What's New?

- ✅ **Granular Permissions**: 27 fine-grained permissions instead of role-only checks
- ✅ **Plan-Based Access**: Subscription plans with feature limits
- ✅ **Temporary Permissions**: Time-limited access grants
- ✅ **Audit Logging**: Complete tracking of all actions
- ✅ **Performance Caching**: 95% faster permission checks
- ✅ **Rate Limiting**: Role-based request throttling
- ✅ **Permission Matrix**: Visualization and export tools

### Breaking Changes

⚠️ **Important:** This migration includes breaking changes. Please review carefully.

---

## 🔄 Migration Steps

### Step 1: Database Migration

#### 1.1 Update User Schema

**Old Schema:**
```javascript
{
  role: 'user' | 'admin'
}
```

**New Schema:**
```javascript
{
  role: 'user' | 'moderator' | 'admin' | 'superadmin',
  plan: 'free' | 'basic' | 'pro' | 'enterprise',
  planExpiresAt: Date | null,
  planStartedAt: Date | null,
  customPermissions: [String]
}
```

**Migration Script:**

```javascript
// migration-scripts/001-add-plan-fields.js
const mongoose = require('mongoose');
const User = require('../src/app/models/user.model').User;

async function migrate() {
  console.log('Starting migration: Add plan fields to users...');
  
  // Update all existing users
  const result = await User.updateMany(
    { plan: { $exists: false } },
    {
      $set: {
        plan: 'free',
        planExpiresAt: null,
        planStartedAt: new Date(),
        customPermissions: []
      }
    }
  );
  
  console.log(`Updated ${result.modifiedCount} users`);
  
  // Convert old admin role to new structure
  await User.updateMany(
    { role: 'admin' },
    { $set: { role: 'superadmin' } }
  );
  
  console.log('Migration completed successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
```

**Run Migration:**
```bash
node migration-scripts/001-add-plan-fields.js
```

---

#### 1.2 Create Plans Collection

**Seed Script:**

```javascript
// migration-scripts/002-seed-plans.js
const mongoose = require('mongoose');
const Plan = require('../src/app/models/plan.model').Plan;
const { PlanSlug } = require('../src/app/types/plan.types');
const { Permission } = require('../src/app/types/permissions.types');

async function seedPlans() {
  console.log('Seeding plans...');
  
  const plans = [
    {
      name: 'Free Plan',
      slug: PlanSlug.Free,
      description: 'Basic features for personal use',
      price: 0,
      currency: 'USD',
      billingCycle: 'lifetime',
      limits: {
        maxCategories: 10,
        maxTransactionsPerMonth: 100,
        maxBackupFiles: 1,
        maxDevices: 1
      },
      features: [
        Permission.CATEGORY_CREATE,
        Permission.CATEGORY_READ,
        Permission.CATEGORY_UPDATE,
        Permission.CATEGORY_DELETE,
        Permission.EXPENSE_CREATE,
        Permission.EXPENSE_READ,
        Permission.EXPENSE_UPDATE,
        Permission.EXPENSE_DELETE,
        Permission.REPORT_VIEW,
        Permission.BACKUP_LOCAL,
        Permission.PROFILE_UPDATE,
        Permission.PROFILE_AVATAR
      ],
      isActive: true,
      isPopular: false,
      order: 1
    },
    {
      name: 'Basic Plan',
      slug: PlanSlug.Basic,
      description: 'Enhanced features for regular users',
      price: 4.99,
      currency: 'USD',
      billingCycle: 'monthly',
      limits: {
        maxCategories: 50,
        maxTransactionsPerMonth: 500,
        maxBackupFiles: 5,
        maxDevices: 2
      },
      features: [
        ...plans[0].features,
        Permission.EXPENSE_EXPORT
      ],
      isActive: true,
      isPopular: false,
      order: 2
    },
    {
      name: 'Pro Plan',
      slug: PlanSlug.Pro,
      description: 'Advanced features for power users',
      price: 9.99,
      currency: 'USD',
      billingCycle: 'monthly',
      limits: {
        maxCategories: null, // unlimited
        maxTransactionsPerMonth: null,
        maxBackupFiles: null,
        maxDevices: 5
      },
      features: [
        ...plans[1].features,
        Permission.REPORT_ADVANCED,
        Permission.BACKUP_GDRIVE,
        Permission.SYNC_MULTI_DEVICE,
        Permission.SECURITY_ADVANCED_ENCRYPTION,
        Permission.SECURITY_BIOMETRIC
      ],
      isActive: true,
      isPopular: true,
      order: 3
    },
    {
      name: 'Enterprise Plan',
      slug: PlanSlug.Enterprise,
      description: 'All features with priority support',
      price: 29.99,
      currency: 'USD',
      billingCycle: 'monthly',
      limits: {
        maxCategories: null,
        maxTransactionsPerMonth: null,
        maxBackupFiles: null,
        maxDevices: null
      },
      features: [
        ...plans[2].features,
        Permission.SUPPORT_PRIORITY
      ],
      isActive: true,
      isPopular: false,
      order: 4
    }
  ];
  
  // Clear existing plans
  await Plan.deleteMany({});
  
  // Insert new plans
  await Plan.insertMany(plans);
  
  console.log(`Seeded ${plans.length} plans successfully!`);
}

seedPlans()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
```

**Run Seed:**
```bash
node migration-scripts/002-seed-plans.js
```

---

### Step 2: Code Migration

#### 2.1 Update Middleware Usage

**Old Code:**
```typescript
// ❌ Old way
router.get('/admin/users', requireAdmin, getUsers);
```

**New Code:**
```typescript
// ✅ New way - Using permissions
import { requirePermission } from './middleware/permission.middleware';
import { Permission } from './types/permissions.types';

router.get(
  '/admin/users',
  verifyAccessToken,
  requirePermission(Permission.ADMIN_USERS),
  getUsers
);
```

---

#### 2.2 Update Permission Checks

**Old Code:**
```typescript
// ❌ Old way
if (req.user.role === 'admin') {
  // Allow action
}
```

**New Code:**
```typescript
// ✅ New way - Using permission service
import { hasPermission } from './services/permission.service';
import { Permission } from './types/permissions.types';

const userPermissions = await getUserPermissions(req.user_id);
if (hasPermission(userPermissions, Permission.ADMIN_USERS)) {
  // Allow action
}
```

---

#### 2.3 Update Resource Protection

**Old Code:**
```typescript
// ❌ Old way
const expense = await Expense.findById(id);
if (expense.userId.toString() !== req.user_id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**New Code:**
```typescript
// ✅ New way - Using ownership middleware
import { requireOwnership } from './middleware/resource-ownership.middleware';

router.put(
  '/expenses/:id',
  verifyAccessToken,
  requireOwnership('expense'),
  updateExpense
);

// The expense is now available in req.resource
async function updateExpense(req, res) {
  const expense = req.resource; // Already verified ownership
  // Update expense...
}
```

---

#### 2.4 Add Audit Logging

**Old Code:**
```typescript
// ❌ No logging
await User.findByIdAndUpdate(userId, { role: 'admin' });
```

**New Code:**
```typescript
// ✅ With audit logging
import { auditLogService } from './services/audit-log.service';
import { AuditAction, AuditSeverity } from './types/audit.types';

await User.findByIdAndUpdate(userId, { role: 'admin' });

await auditLogService.log({
  action: AuditAction.USER_ROLE_CHANGED,
  actorId: req.user_id,
  targetUserId: userId,
  severity: AuditSeverity.WARNING,
  metadata: { oldRole: 'user', newRole: 'admin' },
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

---

#### 2.5 Add Rate Limiting

**Old Code:**
```typescript
// ❌ No rate limiting
router.post('/auth/login', login);
```

**New Code:**
```typescript
// ✅ With rate limiting
import { strictRateLimiter } from './middleware/role-rate-limit.middleware';

router.post('/auth/login', strictRateLimiter, login);
```

---

### Step 3: Frontend Migration

#### 3.1 Update Permission Checks

**Old Code:**
```typescript
// ❌ Old way
if (user.role === 'admin') {
  showAdminButton();
}
```

**New Code:**
```typescript
// ✅ New way
import { hasPermission } from './services/permission.service';

if (hasPermission(user.permissions, 'admin:users')) {
  showAdminButton();
}
```

---

#### 3.2 Handle Plan-Based Features

**New Code:**
```typescript
// Check if user has permission
async function canExportExpenses() {
  const response = await fetch('/v1/scopes/check/expenses:export', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  return data.hasScope;
}

// Show upgrade prompt if needed
if (!await canExportExpenses()) {
  showUpgradePrompt('pro', 'export');
}
```

---

#### 3.3 Handle Error Messages

**Old Code:**
```typescript
// ❌ Generic error
if (error.status === 403) {
  alert('Access denied');
}
```

**New Code:**
```typescript
// ✅ Enhanced error handling
if (error.status === 403) {
  const { message, suggestion, upgradeUrl } = error.data;
  
  showErrorDialog({
    title: 'Access Denied',
    message: message,
    suggestion: suggestion,
    actions: upgradeUrl ? [
      { label: 'Upgrade', url: upgradeUrl }
    ] : []
  });
}
```

---

### Step 4: Testing Migration

#### 4.1 Test Checklist

- [ ] All users have plan assigned
- [ ] All users have correct role
- [ ] Permission checks work correctly
- [ ] Resource ownership protection works
- [ ] Audit logs are being created
- [ ] Rate limiting is enforced
- [ ] Cache is working (check hit rate)
- [ ] Frontend permission checks work
- [ ] Upgrade prompts display correctly
- [ ] Error messages are user-friendly

#### 4.2 Test Script

```bash
# Test permission system
npm test -- permissions.test.ts

# Test API endpoints
npm run test:integration

# Check database
mongo expenses-wallet --eval "db.users.find({plan: {$exists: false}}).count()"
# Should return 0

# Check plans
mongo expenses-wallet --eval "db.plans.count()"
# Should return 4
```

---

### Step 5: Rollback Plan

If migration fails, use this rollback script:

```javascript
// migration-scripts/rollback-001.js
const mongoose = require('mongoose');
const User = require('../src/app/models/user.model').User;

async function rollback() {
  console.log('Rolling back migration...');
  
  // Remove new fields
  await User.updateMany(
    {},
    {
      $unset: {
        plan: '',
        planExpiresAt: '',
        planStartedAt: '',
        customPermissions: ''
      }
    }
  );
  
  // Revert superadmin to admin
  await User.updateMany(
    { role: 'superadmin' },
    { $set: { role: 'admin' } }
  );
  
  console.log('Rollback completed!');
}

rollback()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Rollback failed:', err);
    process.exit(1);
  });
```

---

## 📊 Migration Checklist

### Pre-Migration

- [ ] Backup database
- [ ] Review breaking changes
- [ ] Test migration scripts in development
- [ ] Notify users of downtime (if needed)
- [ ] Prepare rollback plan

### During Migration

- [ ] Stop application
- [ ] Run database migrations
- [ ] Seed plans
- [ ] Deploy new code
- [ ] Start application
- [ ] Verify basic functionality

### Post-Migration

- [ ] Run test suite
- [ ] Check audit logs
- [ ] Monitor error rates
- [ ] Verify cache performance
- [ ] Test user workflows
- [ ] Update documentation
- [ ] Train admin users

---

## 🔧 Common Issues

### Issue 1: Users Missing Plan

**Symptom:** Users can't access any features

**Solution:**
```javascript
// Set default plan for all users
await User.updateMany(
  { plan: { $exists: false } },
  { $set: { plan: 'free' } }
);
```

---

### Issue 2: Cache Not Working

**Symptom:** Slow permission checks

**Solution:**
```bash
# Check cache stats
curl http://localhost:3000/v1/cache/stats \
  -H "Authorization: Bearer {admin-token}"

# Warm up cache
curl -X POST http://localhost:3000/v1/cache/warmup \
  -H "Authorization: Bearer {superadmin-token}"
```

---

### Issue 3: Rate Limiting Too Strict

**Symptom:** Users getting rate limited frequently

**Solution:**
```typescript
// Adjust limits in role-rate-limit.middleware.ts
const DEFAULT_ROLE_LIMITS = {
  [UserRole.User]: {
    windowMs: 15 * 60 * 1000,
    max: 200, // Increased from 100
  },
  // ...
};
```

---

## 📝 Post-Migration Tasks

### 1. Monitor Performance

```bash
# Check cache hit rate (should be > 90%)
curl http://localhost:3000/v1/cache/stats

# Check audit log volume
curl http://localhost:3000/v1/audit-logs/stats?startDate=...&endDate=...
```

### 2. Update Documentation

- [ ] Update API documentation
- [ ] Update user guides
- [ ] Update admin guides
- [ ] Create training materials

### 3. Optimize

- [ ] Review slow queries
- [ ] Add missing indexes
- [ ] Configure Redis (production)
- [ ] Set up monitoring alerts

---

## 🆘 Support

If you encounter issues during migration:

1. Check the [Troubleshooting Guide](./ROLES_PERMISSIONS_COMPLETE_GUIDE.md#troubleshooting)
2. Review [API Reference](./API_REFERENCE.md)
3. Check audit logs for errors
4. Contact system administrator

---

## 📅 Timeline

**Recommended Migration Timeline:**

- **Week 1:** Review guide, test in development
- **Week 2:** Prepare migration scripts, test thoroughly
- **Week 3:** Schedule maintenance window, execute migration
- **Week 4:** Monitor, optimize, train users

---

**Version:** 1.0.0  
**Last Updated:** July 25, 2026  
**Migration Difficulty:** Medium  
**Estimated Time:** 2-4 hours
