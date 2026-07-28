# Permission Testing Guide

## Overview

This guide explains how to use the permission testing utilities to validate the authorization system.

## Testing Utilities

### Location
- **Utils**: `src/app/utils/permission-test.utils.ts`
- **Tests**: `src/app/tests/permissions.test.ts`

## Mock User Creation

### Basic Mock User
```typescript
import { createMockUser } from '../utils/permission-test.utils';

const user = createMockUser();
// Default: User role, Free plan, no permissions
```

### Mock User with Overrides
```typescript
const admin = createMockUser({
  email: 'admin@example.com',
  role: UserRole.Admin,
  plan: PlanSlug.Pro,
});
```

### Mock User with Role
```typescript
import { createMockUserWithRole } from '../utils/permission-test.utils';

const moderator = createMockUserWithRole(UserRole.Moderator);
// Automatically includes all moderator permissions
```

### Mock User with Plan
```typescript
import { createMockUserWithPlan } from '../utils/permission-test.utils';

const proUser = createMockUserWithPlan(PlanSlug.Pro);
// Automatically includes all pro plan permissions
```

### Mock User with Specific Permissions
```typescript
import { createMockUserWithPermissions } from '../utils/permission-test.utils';

const customUser = createMockUserWithPermissions([
  Permission.EXPENSE_CREATE,
  Permission.EXPENSE_READ,
  Permission.EXPENSE_EXPORT,
]);
```

## Permission Assertions

### Assert Has Permission
```typescript
import { assertHasPermission } from '../utils/permission-test.utils';

const user = createMockUserWithPlan(PlanSlug.Pro);

// This will pass
assertHasPermission(user, Permission.EXPENSE_EXPORT);

// This will throw an error
assertHasPermission(user, Permission.ADMIN_PLANS);
```

### Assert Lacks Permission
```typescript
import { assertLacksPermission } from '../utils/permission-test.utils';

const freeUser = createMockUserWithPlan(PlanSlug.Free);

// This will pass
assertLacksPermission(freeUser, Permission.EXPENSE_EXPORT);
```

### Assert Has All Permissions
```typescript
import { assertHasAllPermissions } from '../utils/permission-test.utils';

const user = createMockUserWithRole(UserRole.Admin);

assertHasAllPermissions(user, [
  Permission.ADMIN_DASHBOARD,
  Permission.ADMIN_USERS,
  Permission.ADMIN_CATEGORIES,
]);
```

### Assert Has Any Permission
```typescript
import { assertHasAnyPermission } from '../utils/permission-test.utils';

const user = createMockUserWithPlan(PlanSlug.Pro);

assertHasAnyPermission(user, [
  Permission.EXPENSE_EXPORT,
  Permission.REPORT_ADVANCED,
]);
```

## Predefined Test Scenarios

### Available Scenarios

```typescript
import { TestScenarios } from '../utils/permission-test.utils';

// Free user trying to export (should fail)
TestScenarios.freeUserExport

// Pro user trying to export (should pass)
TestScenarios.proUserExport

// Regular user trying to access admin (should fail)
TestScenarios.userAccessAdmin

// Admin trying to manage plans (should fail)
TestScenarios.adminManagePlans

// SuperAdmin trying to manage plans (should pass)
TestScenarios.superAdminManagePlans
```

### Using Scenarios in Tests

```typescript
import { TestScenarios, simulatePermissionCheck } from '../utils/permission-test.utils';

describe('Export Permission', () => {
  it('should deny export for free users', () => {
    const scenario = TestScenarios.freeUserExport;
    const result = simulatePermissionCheck(
      scenario.user,
      scenario.permission
    );
    
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('does not have permission');
  });
});
```

## Permission Matrix

### Accessing the Matrix

```typescript
import { PermissionMatrix } from '../utils/permission-test.utils';

// Get permissions for a role
const adminPermissions = PermissionMatrix.roles[UserRole.Admin];

// Get permissions for a plan
const proPermissions = PermissionMatrix.plans[PlanSlug.Pro];
```

### Validating the Matrix

```typescript
import { validatePermissionMatrix } from '../utils/permission-test.utils';

const validation = validatePermissionMatrix();

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

### Printing the Matrix

```typescript
import { printPermissionMatrix } from '../utils/permission-test.utils';

printPermissionMatrix();
// Outputs a formatted view of all permissions
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Permission Tests Only
```bash
npm test permissions.test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Writing Custom Tests

### Example: Test New Permission

```typescript
import {
  createMockUserWithPlan,
  assertHasPermission,
  assertLacksPermission,
} from '../utils/permission-test.utils';
import { Permission } from '../types/permissions.types';
import { PlanSlug } from '../types/plan.types';

describe('New Feature Permission', () => {
  it('should grant feature to pro users', () => {
    const proUser = createMockUserWithPlan(PlanSlug.Pro);
    assertHasPermission(proUser, Permission.NEW_FEATURE);
  });

  it('should deny feature to free users', () => {
    const freeUser = createMockUserWithPlan(PlanSlug.Free);
    assertLacksPermission(freeUser, Permission.NEW_FEATURE);
  });
});
```

### Example: Test Role Hierarchy

```typescript
describe('Role Hierarchy', () => {
  it('should ensure admins have moderator permissions', () => {
    const modPerms = PermissionMatrix.roles[UserRole.Moderator];
    const adminPerms = PermissionMatrix.roles[UserRole.Admin];

    modPerms.forEach((perm) => {
      expect(adminPerms).toContain(perm);
    });
  });
});
```

### Example: Test Permission Upgrade Path

```typescript
describe('Upgrade Path', () => {
  it('should show what user gains by upgrading', () => {
    const freePerms = PermissionMatrix.plans[PlanSlug.Free];
    const proPerms = PermissionMatrix.plans[PlanSlug.Pro];

    const newPermissions = proPerms.filter(
      (perm) => !freePerms.includes(perm)
    );

    expect(newPermissions).toContain(Permission.EXPENSE_EXPORT);
    expect(newPermissions).toContain(Permission.REPORT_ADVANCED);
    expect(newPermissions.length).toBeGreaterThan(0);
  });
});
```

## Integration Testing

### Test with Actual Middleware

```typescript
import request from 'supertest';
import { app } from '../app';
import { createMockUser } from '../utils/permission-test.utils';

describe('Permission Middleware Integration', () => {
  it('should deny access without permission', async () => {
    const freeUser = createMockUserWithPlan(PlanSlug.Free);
    
    // Mock authentication
    jest.spyOn(authMiddleware, 'verifyAccessToken')
      .mockImplementation((req, res, next) => {
        req.user_id = freeUser._id;
        req.user = freeUser;
        next();
      });

    const response = await request(app)
      .get('/api/v1/expenses/export')
      .expect(403);

    expect(response.body.error.code).toBe('PERMISSION_DENIED');
  });
});
```

## Best Practices

### 1. Test All Permission Combinations
```typescript
import { generatePermissionTestCases } from '../utils/permission-test.utils';

const testCases = generatePermissionTestCases();
testCases.forEach(({ role, plan, permission, expected }) => {
  it(`${role} with ${plan} should ${expected ? 'have' : 'not have'} ${permission}`, () => {
    // Test implementation
  });
});
```

### 2. Validate Matrix Consistency
```typescript
beforeAll(() => {
  const validation = validatePermissionMatrix();
  if (!validation.valid) {
    throw new Error(`Permission matrix invalid: ${validation.errors.join(', ')}`);
  }
});
```

### 3. Test Edge Cases
```typescript
describe('Edge Cases', () => {
  it('should handle users with no permissions', () => {
    const user = createMockUser({ permissions: [] });
    expect(user.permissions).toHaveLength(0);
  });

  it('should handle users with duplicate permissions', () => {
    const user = createMockUser({
      permissions: [Permission.EXPENSE_CREATE, Permission.EXPENSE_CREATE],
    });
    // Should deduplicate
  });
});
```

### 4. Test Permission Changes
```typescript
describe('Permission Updates', () => {
  it('should reflect permission changes after plan upgrade', () => {
    const user = createMockUserWithPlan(PlanSlug.Free);
    assertLacksPermission(user, Permission.EXPENSE_EXPORT);

    // Simulate upgrade
    user.plan = PlanSlug.Pro;
    user.permissions = PermissionMatrix.plans[PlanSlug.Pro];
    
    assertHasPermission(user, Permission.EXPENSE_EXPORT);
  });
});
```

## Debugging

### Print User Permissions
```typescript
const user = createMockUserWithRole(UserRole.Admin);
console.log('User permissions:', user.permissions);
```

### Check Specific Permission
```typescript
const result = simulatePermissionCheck(user, Permission.ADMIN_USERS);
console.log('Permission check:', result);
```

### View Full Matrix
```typescript
import { printPermissionMatrix } from '../utils/permission-test.utils';
printPermissionMatrix();
```

## Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Permission Tests
  run: npm test permissions.test

- name: Validate Permission Matrix
  run: npm run validate-permissions
```

## Troubleshooting

### Test Fails with "Permission not found"
- Check that the permission is defined in `permissions.types.ts`
- Verify the permission is included in the appropriate role/plan matrix

### Matrix Validation Fails
- Run `validatePermissionMatrix()` to see specific errors
- Ensure role/plan hierarchies are maintained
- Check for missing permissions in higher tiers

### Mock User Has Wrong Permissions
- Verify you're using the correct creation function
- Check the `PermissionMatrix` for expected permissions
- Ensure overrides are applied correctly

## Support

For questions or issues with permission testing, check:
- Permission types: `src/app/types/permissions.types.ts`
- Permission scopes: `src/app/types/permission-scopes.types.ts`
- Test utilities: `src/app/utils/permission-test.utils.ts`
