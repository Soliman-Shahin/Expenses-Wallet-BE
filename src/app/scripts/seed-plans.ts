/**
 * Seed Script: Initialize Default Plans
 *
 * This script seeds the database with the default subscription plans
 * (Free, Pro, Premium) if they don't already exist.
 *
 * Usage:
 *   npm run seed:plans
 *   or
 *   ts-node src/app/scripts/seed-plans.ts
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { planService } from '../services/plan.service';
import logger from '../services/logger.service';

config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/expenses-wallet';

async function seedPlans() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB successfully');

    // Seed default plans
    logger.info('Seeding default plans...');
    await planService.seedDefaultPlans();
    logger.info('✅ Plans seeded successfully!');

    // Display summary
    const plans = await planService.getAllPlans();
    logger.info(`\nTotal plans in database: ${plans.length}`);
    plans.forEach((plan) => {
      logger.info(
        `  - ${plan.name} (${plan.slug}): $${plan.price}/${plan.billingCycle}`
      );
    });

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Error seeding plans:');
    logger.error(error);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

// Run the seed script
seedPlans();
