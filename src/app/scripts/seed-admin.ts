/**
 * Create or update a local admin user for the Admin dashboard.
 *
 * Usage:
 *   npm run seed:admin
 *   npm run seed:admin -- admin@example.com MyPassword123
 */
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectToDB } from '../db';
import { User, UserRole } from '../models/user.model';
import { PlanSlug } from '../types/plan.types';
import logger from '../services/logger.service';

config();

async function seedAdmin() {
  const email = (process.argv[2] || 'admin@example.com').toLowerCase();
  const password = process.argv[3] || 'Admin123!';

  try {
    await connectToDB();

    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS || '10', 10)
    );

    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = UserRole.Admin;
      existing.isActive = true;
      existing.password = hashedPassword;
      existing.image = undefined;
      await existing.save();
      logger.info(`Updated admin user: ${email}`);
    } else {
      await User.create({
        email,
        password: hashedPassword,
        role: UserRole.Admin,
        isActive: true,
        plan: PlanSlug.Free,
        customPermissions: [],
        sessions: [],
      });
      logger.info(`Created admin user: ${email}`);
    }

    logger.info(`Login with email: ${email}`);
    logger.info(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed admin user:', error as Error);
    process.exit(1);
  }
}

seedAdmin();
