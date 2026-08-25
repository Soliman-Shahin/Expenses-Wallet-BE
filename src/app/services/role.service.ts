import { Role, RoleDocument } from '../models/role.model';
import { User } from '../models/user.model';
import { permissionCacheService } from './permission-cache.service';

// Whitelist of sortable fields: maps the field name the frontend sends
// to the actual field name on the Role document. Never pass a raw,
// unvalidated field name into .sort().
const SORTABLE_FIELDS: Record<string, string> = {
  role: 'slug',
  slug: 'slug',
  name: 'name',
  createdAt: 'createdAt',
};

const DEFAULT_SORT_FIELD = 'createdAt';
const MAX_LIMIT = 100;

export interface GetRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class RoleService {
  public async getAllRoles(
    params: GetRolesParams = {}
  ): Promise<PaginatedResult<RoleDocument>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || 10));
    const search = (params.search || '').trim();

    const filter: any = {};
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { description: regex }];
    }

    const sortKey =
      (params.sortField && SORTABLE_FIELDS[params.sortField]) ||
      DEFAULT_SORT_FIELD;
    const sortDirection = params.sortOrder === 1 ? 1 : -1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Role.find(filter)
        .sort({ [sortKey]: sortDirection })
        .skip(skip)
        .limit(limit),
      Role.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  public async getRoleById(id: string): Promise<RoleDocument | null> {
    return Role.findById(id);
  }

  public async getRoleBySlug(slug: string): Promise<RoleDocument | null> {
    return Role.findOne({ slug: slug.toLowerCase() });
  }

  public async createRole(data: Partial<RoleDocument>): Promise<RoleDocument> {
    if (data.slug) {
      data.slug = data.slug.toLowerCase();
    }
    const role = new Role(data);
    return role.save();
  }

  public async updateRole(
    id: string,
    data: Partial<RoleDocument>
  ): Promise<RoleDocument | null> {
    const role = await Role.findById(id);
    if (!role) return null;

    if (role.isSystem && data.slug && data.slug !== role.slug) {
      throw new Error('Cannot change slug of a system role');
    }

    if (data.slug) {
      data.slug = data.slug.toLowerCase();
    }

    Object.assign(role, data);
    await role.save();

    // Clear permission cache for all users with this role so they get updated permissions
    const usersWithRole = await User.find({ role: role.slug }, { _id: 1 });
    for (const u of usersWithRole) {
      permissionCacheService.invalidateUser(u._id.toString());
    }

    return role;
  }

  public async deleteRole(id: string): Promise<void> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    if (role.isSystem) {
      throw new Error('Cannot delete a system role');
    }

    // Check if any users are using this role
    const usersCount = await User.countDocuments({ role: role.slug });
    if (usersCount > 0) {
      throw new Error(
        `Cannot delete role. It is assigned to ${usersCount} users.`
      );
    }

    await Role.findByIdAndDelete(id);
  }
}

export const roleService = new RoleService();
