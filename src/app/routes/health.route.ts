import { Router } from "express";
import {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
} from "../controllers/health.controller";

const router = Router();

/**
 * Health Check Routes
 * These endpoints are typically used by monitoring systems and orchestrators
 */

// Basic health check - lightweight
router.get("/", basicHealthCheck);

// Detailed health check - comprehensive
router.get("/detailed", detailedHealthCheck);

// Readiness check - for Kubernetes
router.get("/ready", readinessCheck);

// Liveness check - for Kubernetes
router.get("/live", livenessCheck);

export default router;
