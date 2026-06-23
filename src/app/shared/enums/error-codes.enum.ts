/**
 * Standardized Error Codes
 *
 * Provides consistent error codes across the application for better debugging
 * and client-side error handling.
 *
 * Format: CATEGORY_DESCRIPTION
 * Categories: AUTH, VALIDATION, RESOURCE, DATABASE, EXTERNAL, ENCRYPTION, FILE, BUSINESS
 */

export enum ErrorCode {
  // ==================== Authentication Errors (AUTH_xxx) ====================
  AUTH_FAILED = 'AUTHENTICATION_FAILED',
  AUTH_INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN = 'INVALID_TOKEN',
  AUTH_ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // ==================== Authorization Errors (AUTHZ_xxx) ====================
  AUTHZ_FAILED = 'AUTHORIZATION_FAILED',
  AUTHZ_FORBIDDEN = 'FORBIDDEN',
  AUTHZ_INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // ==================== Resource Errors (RESOURCE_xxx) ====================
  RESOURCE_NOT_FOUND = 'NOT_FOUND',
  RESOURCE_CONFLICT = 'CONFLICT',
  RESOURCE_DUPLICATE = 'RESOURCE_DUPLICATE',

  // ==================== Validation Errors (VALIDATION_xxx) ====================
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  VALIDATION_BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_INVALID_OPERATION = 'INVALID_OPERATION',

  // ==================== Database Errors (DB_xxx) ====================
  DB_ERROR = 'DATABASE_ERROR',
  DB_DUPLICATE_KEY = 'DB_DUPLICATE_KEY',

  // ==================== External Service Errors (EXTERNAL_xxx) ====================
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // ==================== Encryption Errors (CRYPTO_xxx) ====================
  CRYPTO_ENCRYPTION_FAILED = 'ENCRYPTION_ERROR',
  CRYPTO_DECRYPTION_FAILED = 'DECRYPTION_ERROR',

  // ==================== File Upload Errors (FILE_xxx) ====================
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'INVALID_FILE_TYPE',

  // ==================== Rate Limiting Errors (RATE_xxx) ====================
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // ==================== Internal Errors (INTERNAL_xxx) ====================
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * HTTP Status Code mapping for error codes
 */
export const ErrorCodeStatusMap: Record<ErrorCode, number> = {
  // Authentication - 401
  [ErrorCode.AUTH_FAILED]: 401,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 429,

  // Authorization - 403
  [ErrorCode.AUTHZ_FAILED]: 403,
  [ErrorCode.AUTHZ_FORBIDDEN]: 403,
  [ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS]: 403,

  // Resource - 404, 409
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.RESOURCE_DUPLICATE]: 409,

  // Validation - 400
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.VALIDATION_BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_INVALID_OPERATION]: 400,

  // Database - 500, 409
  [ErrorCode.DB_ERROR]: 500,
  [ErrorCode.DB_DUPLICATE_KEY]: 409,

  // External - 502
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,

  // Encryption - 500, 400
  [ErrorCode.CRYPTO_ENCRYPTION_FAILED]: 500,
  [ErrorCode.CRYPTO_DECRYPTION_FAILED]: 400,

  // File - 400, 413
  [ErrorCode.FILE_UPLOAD_ERROR]: 400,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.FILE_INVALID_TYPE]: 400,

  // Rate Limiting - 429
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  // Internal - 500
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * User-friendly error messages for each error code
 */
export const ErrorCodeMessageMap: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_FAILED]: 'Authentication failed. Please log in again.',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCode.AUTH_TOKEN_EXPIRED]:
    'Your session has expired. Please log in again.',
  [ErrorCode.AUTH_INVALID_TOKEN]: 'Invalid authentication token.',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]:
    'Account locked due to too many failed attempts.',

  [ErrorCode.AUTHZ_FAILED]:
    'You do not have permission to perform this action.',
  [ErrorCode.AUTHZ_FORBIDDEN]: 'Access forbidden.',
  [ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions.',

  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found.',
  [ErrorCode.RESOURCE_CONFLICT]: 'Resource already exists.',
  [ErrorCode.RESOURCE_DUPLICATE]: 'Duplicate resource.',

  [ErrorCode.VALIDATION_FAILED]: 'Validation failed. Please check your input.',
  [ErrorCode.VALIDATION_BAD_REQUEST]: 'Bad request. Please check your input.',
  [ErrorCode.VALIDATION_INVALID_OPERATION]: 'Invalid operation.',

  [ErrorCode.DB_ERROR]: 'Database operation failed. Please try again.',
  [ErrorCode.DB_DUPLICATE_KEY]: 'Duplicate entry found.',

  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    'External service error. Please try again later.',

  [ErrorCode.CRYPTO_ENCRYPTION_FAILED]: 'Encryption failed.',
  [ErrorCode.CRYPTO_DECRYPTION_FAILED]:
    'Decryption failed. Invalid data or key.',

  [ErrorCode.FILE_UPLOAD_ERROR]: 'File upload failed.',
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds maximum allowed size.',
  [ErrorCode.FILE_INVALID_TYPE]: 'Invalid file type.',

  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',

  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
};
