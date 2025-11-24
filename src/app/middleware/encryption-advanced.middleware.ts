import { Request, Response, NextFunction } from "express";
import {
  encryptAdvanced,
  decryptAdvanced,
} from "../shared/encryption-advanced";

/**
 * Enhanced Encryption Middleware with Selective Encryption
 *
 * Features:
 * - Selective encryption based on configuration
 * - Smart detection of encrypted payloads
 * - Support for nested encryption
 * - Performance optimized
 */

interface EncryptionOptions {
  // Paths to exclude from encryption (e.g., health checks, public endpoints)
  excludePaths?: string[];
  // Paths to force encryption (overrides other rules)
  includePaths?: string[];
  // Whether to encrypt all responses by default
  encryptByDefault?: boolean;
  // Maximum payload size to encrypt (in bytes)
  maxPayloadSize?: number;
}

const defaultOptions: EncryptionOptions = {
  excludePaths: ["/health", "/v1/health", "/favicon.ico"],
  includePaths: [
    "/v1/users/login",
    "/v1/users/signup",
    "/v1/users/me",
    "/v1/expenses",
    "/v1/categories",
    "/v1/sync",
  ],
  encryptByDefault: false,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Check if path should be encrypted
 */
function shouldEncryptPath(path: string, options: EncryptionOptions): boolean {
  // Check excluded paths first
  if (options.excludePaths?.some((p) => path.startsWith(p))) {
    return false;
  }

  // Check included paths
  if (options.includePaths?.some((p) => path.startsWith(p))) {
    return true;
  }

  // Use default behavior
  return options.encryptByDefault || false;
}

/**
 * Check if data is already encrypted (our format: iv:authTag:data)
 */
function isAlreadyEncrypted(data: any): boolean {
  if (typeof data === "string") {
    const parts = data.split(":");
    return parts.length === 3;
  }
  if (data && typeof data === "object" && data.encrypted === true) {
    return true;
  }
  return false;
}

/**
 * Create encryption middleware with custom options
 */
export function createEncryptionMiddleware(customOptions?: EncryptionOptions) {
  const options = { ...defaultOptions, ...customOptions };

  return (req: Request, res: Response, next: NextFunction) => {
    const shouldEncrypt = shouldEncryptPath(req.path, options);

    // Skip encryption for this path
    if (!shouldEncrypt) {
      return next();
    }

    // ============================================
    // DECRYPT INCOMING REQUEST BODY
    // ============================================
    if (req.body && req.body.encrypted && req.body.data) {
      try {
        const decrypted = decryptAdvanced(req.body.data);
        if (decrypted) {
          req.body = decrypted;
        } else {
          console.warn("⚠️  Failed to decrypt request body, using original");
        }
      } catch (error) {
        console.error("❌ Request decryption error:", error);
        // Don't fail the request, just log the error
      }
    }

    // ============================================
    // ENCRYPT OUTGOING RESPONSE BODY
    // ============================================
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      // Skip encryption for errors or if already encrypted
      if (!body || isAlreadyEncrypted(body)) {
        return originalJson(body);
      }

      // Check payload size
      const bodySize = JSON.stringify(body).length;
      if (options.maxPayloadSize && bodySize > options.maxPayloadSize) {
        console.warn(
          `⚠️  Payload too large for encryption (${bodySize} bytes), skipping`
        );
        return originalJson(body);
      }

      try {
        // Encrypt the response
        const encrypted = encryptAdvanced(body);
        return originalJson({
          encrypted: true,
          data: encrypted,
        });
      } catch (error) {
        console.error("❌ Response encryption error:", error);
        // Fall back to unencrypted response
        return originalJson(body);
      }
    };

    next();
  };
}

/**
 * Default encryption middleware (backward compatible)
 */
export const advancedEncryptionMiddleware = createEncryptionMiddleware();

/**
 * Middleware factory for specific routes
 * Usage: router.use(encryptRoute())
 */
export function encryptRoute() {
  return createEncryptionMiddleware({
    encryptByDefault: true,
    excludePaths: [],
  });
}

/**
 * Disable encryption for specific route
 * Usage: router.use(noEncryption())
 */
export function noEncryption() {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}

export default advancedEncryptionMiddleware;
