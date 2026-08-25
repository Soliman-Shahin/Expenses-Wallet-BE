import { Router } from 'express';
import { planController } from '../controllers/plan.controller';
import { verifyAccessToken } from '../middleware/access.middleware';
import { attachPlanContext } from '../middleware/plan.middleware';

const router = Router();

// ==================== PUBLIC ====================

/**
 * GET /v1/plans
 * Returns all active plans for display in the pricing/upgrade screen.
 * No authentication required.
 */
router.get('/', planController.getActivePlans.bind(planController));

// ==================== AUTHENTICATED USER ====================

// All routes below require a valid access token and plan context.
router.use(verifyAccessToken, attachPlanContext);

/**
 * GET /v1/plans/me
 * Returns the authenticated user's current plan, permissions, limits, and usage stats.
 */
router.get('/me', planController.getMyPlan.bind(planController));

/**
 * POST /v1/plans/upgrade
 * Allows a user to upgrade their plan.
 * Body: { planSlug: 'pro' | 'premium', paymentRef?: string }
 */
router.post('/upgrade', planController.upgradePlan.bind(planController));

export default router;
