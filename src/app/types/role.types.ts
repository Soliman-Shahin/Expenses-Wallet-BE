/**
 * Role Types
 *
 * Re-exports UserRole from user.model.ts for cleaner imports
 * and consistent type usage across the application.
 */

export {
  UserRole as Role,
  ROLE_WEIGHTS,
  canManageTargetRole,
  canAssignRole,
} from '../models/user.model';
