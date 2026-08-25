import { config } from 'dotenv';
import { connectToDB } from '../db';
import { Role } from '../models/role.model';
import { Permission, PERMISSION_GROUPS } from '../types/permissions.types';
config();

const DEFAULT_ROLES = [
  {
    name: 'User',
    slug: 'user',
    description: 'Regular application user',
    permissions: [], // Users get their permissions from plans
    isSystem: true,
  },
  {
    name: 'Moderator',
    slug: 'moderator',
    description: 'Read-only access to the admin dashboard',
    permissions: [
      Permission.ADMIN_DASHBOARD,
      Permission.ADMIN_USERS,
      Permission.ADMIN_CATEGORIES,
      Permission.ADMIN_EXPENSES,
      Permission.ADMIN_SYNC,
      Permission.ADMIN_HEALTH,
      Permission.ADMIN_PLANS,
      Permission.REPORT_VIEW,
      Permission.REPORT_ADVANCED,
    ],
    isSystem: true,
  },
  {
    name: 'Admin',
    slug: 'admin',
    description:
      'Full admin dashboard access (cannot manage plans or other admins)',
    permissions: [
      Permission.ADMIN_DASHBOARD,
      Permission.ADMIN_USERS,
      Permission.ADMIN_CATEGORIES,
      Permission.ADMIN_EXPENSES,
      Permission.ADMIN_SYNC,
      Permission.ADMIN_HEALTH,
      Permission.ADMIN_PLANS,
      ...PERMISSION_GROUPS['reports'],
      ...PERMISSION_GROUPS['backup'],
      ...PERMISSION_GROUPS['categories'],
    ],
    isSystem: true,
  },
  {
    name: 'SuperAdmin',
    slug: 'superadmin',
    description: 'Unrestricted access including plan and admin management',
    permissions: Object.values(Permission),
    isSystem: true,
  },
];

const seedRoles = async () => {
  try {
    console.log('Connecting to database...');
    await connectToDB();

    console.log('Seeding default roles...');
    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ slug: roleData.slug });
      if (existing) {
        console.log(
          `Role ${roleData.slug} already exists. Updating permissions...`
        );
        existing.permissions = roleData.permissions;
        await existing.save();
      } else {
        console.log(`Creating role ${roleData.slug}...`);
        await Role.create(roleData);
      }
    }

    console.log('Roles seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();
