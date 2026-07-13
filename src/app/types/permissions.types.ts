/**
 * Permissions Types
 *
 * Defines the full enumeration of granular permissions used throughout the
 * application for role-based and plan-based access control (RBAC).
 *
 * Naming convention: `resource:action`
 */

export enum Permission {
  // ==================== Categories ====================
  /** Create a new category */
  CATEGORY_CREATE = 'category:create',
  /** Read / list categories */
  CATEGORY_READ = 'category:read',
  /** Update an existing category */
  CATEGORY_UPDATE = 'category:update',
  /** Delete a category */
  CATEGORY_DELETE = 'category:delete',

  // ==================== Expenses / Transactions ====================
  /** Create a new expense/transaction */
  EXPENSE_CREATE = 'expense:create',
  /** Read / list expenses */
  EXPENSE_READ = 'expense:read',
  /** Update an existing expense */
  EXPENSE_UPDATE = 'expense:update',
  /** Delete an expense */
  EXPENSE_DELETE = 'expense:delete',
  /** Export expenses to CSV / PDF */
  EXPENSE_EXPORT = 'expense:export',

  // ==================== Reports ====================
  /** View basic reports */
  REPORT_VIEW = 'report:view',
  /** View advanced analytics and insights */
  REPORT_ADVANCED = 'report:advanced',

  // ==================== Backup & Sync ====================
  /** Perform local backup */
  BACKUP_LOCAL = 'backup:local',
  /** Sync with Google Drive */
  BACKUP_GDRIVE = 'backup:gdrive',
  /** Sync data across multiple devices */
  SYNC_MULTI_DEVICE = 'sync:multi_device',

  // ==================== Profile ====================
  /** Update profile information */
  PROFILE_UPDATE = 'profile:update',
  /** Upload or change avatar */
  PROFILE_AVATAR = 'profile:avatar',

  // ==================== Support ====================
  /** Access priority support */
  SUPPORT_PRIORITY = 'support:priority',

  // ==================== Security ====================
  /** Use advanced end-to-end encryption */
  SECURITY_ADVANCED_ENCRYPTION = 'security:advanced_encryption',
  /** Enable biometric authentication */
  SECURITY_BIOMETRIC = 'security:biometric',

  // ==================== Admin Panel ====================
  /** Access the admin dashboard */
  ADMIN_DASHBOARD = 'admin:dashboard',
  /** View and manage users */
  ADMIN_USERS = 'admin:users',
  /** View and manage categories (admin panel) */
  ADMIN_CATEGORIES = 'admin:categories',
  /** View and manage expenses (admin panel) */
  ADMIN_EXPENSES = 'admin:expenses',
  /** View sync operations and conflicts */
  ADMIN_SYNC = 'admin:sync',
  /** View system health metrics */
  ADMIN_HEALTH = 'admin:health',
  /** Manage subscription plans */
  ADMIN_PLANS = 'admin:plans',
}

/**
 * Permission groups organized by resource area.
 * Useful for building permission matrices in the admin UI.
 */
export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  categories: [
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
  ],
  expenses: [
    Permission.EXPENSE_CREATE,
    Permission.EXPENSE_READ,
    Permission.EXPENSE_UPDATE,
    Permission.EXPENSE_DELETE,
    Permission.EXPENSE_EXPORT,
  ],
  reports: [Permission.REPORT_VIEW, Permission.REPORT_ADVANCED],
  backup: [
    Permission.BACKUP_LOCAL,
    Permission.BACKUP_GDRIVE,
    Permission.SYNC_MULTI_DEVICE,
  ],
  profile: [Permission.PROFILE_UPDATE, Permission.PROFILE_AVATAR],
  support: [Permission.SUPPORT_PRIORITY],
  security: [
    Permission.SECURITY_ADVANCED_ENCRYPTION,
    Permission.SECURITY_BIOMETRIC,
  ],
  admin: [
    Permission.ADMIN_DASHBOARD,
    Permission.ADMIN_USERS,
    Permission.ADMIN_CATEGORIES,
    Permission.ADMIN_EXPENSES,
    Permission.ADMIN_SYNC,
    Permission.ADMIN_HEALTH,
    Permission.ADMIN_PLANS,
  ],
};
