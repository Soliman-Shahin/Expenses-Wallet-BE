/**
 * Custom Error Classes Hierarchy
 *
 * Provides specific error types for better error handling and logging
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ==================== Authentication Errors ====================

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed", details?: any) {
    super(message, 401, "AUTHENTICATION_FAILED", true, details);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = "Invalid email or password") {
    super(message, 401, "INVALID_CREDENTIALS", true);
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = "Token has expired") {
    super(message, 401, "TOKEN_EXPIRED", true);
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = "Invalid token") {
    super(message, 401, "INVALID_TOKEN", true);
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

// ==================== Authorization Errors ====================

export class AuthorizationError extends AppError {
  constructor(
    message: string = "You do not have permission to perform this action"
  ) {
    super(message, 403, "AUTHORIZATION_FAILED", true);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, 403, "FORBIDDEN", true);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

// ==================== Resource Errors ====================

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT", true);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// ==================== Validation Errors ====================

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: any) {
    super(message, 400, "VALIDATION_ERROR", true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: any) {
    super(message, 400, "BAD_REQUEST", true, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

// ==================== Rate Limiting Errors ====================

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", true, { retryAfter });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class AccountLockedError extends AppError {
  constructor(remainingTime?: number) {
    const message = remainingTime
      ? `Account locked due to too many failed attempts. Try again in ${remainingTime} seconds`
      : "Account locked due to too many failed attempts";
    super(message, 429, "ACCOUNT_LOCKED", true, { remainingTime });
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

// ==================== Database Errors ====================

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed", details?: any) {
    super(message, 500, "DATABASE_ERROR", true, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class DuplicateKeyError extends AppError {
  constructor(field: string) {
    super(`Duplicate value for field: ${field}`, 409, "DUPLICATE_KEY", true, {
      field,
    });
    Object.setPrototypeOf(this, DuplicateKeyError.prototype);
  }
}

// ==================== External Service Errors ====================

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = "External service error") {
    super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR", true, {
      service,
    });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

// ==================== Encryption Errors ====================

export class EncryptionError extends AppError {
  constructor(message: string = "Encryption failed") {
    super(message, 500, "ENCRYPTION_ERROR", true);
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

export class DecryptionError extends AppError {
  constructor(message: string = "Decryption failed") {
    super(message, 400, "DECRYPTION_ERROR", true);
    Object.setPrototypeOf(this, DecryptionError.prototype);
  }
}

// ==================== File Upload Errors ====================

export class FileUploadError extends AppError {
  constructor(message: string = "File upload failed", details?: any) {
    super(message, 400, "FILE_UPLOAD_ERROR", true, details);
    Object.setPrototypeOf(this, FileUploadError.prototype);
  }
}

export class FileSizeTooLargeError extends AppError {
  constructor(maxSize: string) {
    super(
      `File size exceeds maximum allowed size of ${maxSize}`,
      413,
      "FILE_TOO_LARGE",
      true
    );
    Object.setPrototypeOf(this, FileSizeTooLargeError.prototype);
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(allowedTypes: string[]) {
    super(
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
      400,
      "INVALID_FILE_TYPE",
      true,
      { allowedTypes }
    );
    Object.setPrototypeOf(this, InvalidFileTypeError.prototype);
  }
}

// ==================== Business Logic Errors ====================

export class InsufficientPermissionsError extends AppError {
  constructor(
    message: string = "Insufficient permissions to perform this action"
  ) {
    super(message, 403, "INSUFFICIENT_PERMISSIONS", true);
    Object.setPrototypeOf(this, InsufficientPermissionsError.prototype);
  }
}

export class InvalidOperationError extends AppError {
  constructor(message: string = "Invalid operation") {
    super(message, 400, "INVALID_OPERATION", true);
    Object.setPrototypeOf(this, InvalidOperationError.prototype);
  }
}

// ==================== Helper Functions ====================

/**
 * Check if error is an operational error (safe to expose to client)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Handle Mongoose errors
  if (error.name === "ValidationError") {
    return new ValidationError("Validation failed", error.errors);
  }

  if (error.name === "CastError") {
    return new BadRequestError(`Invalid ${error.path}: ${error.value}`);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return new DuplicateKeyError(field);
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    return new InvalidTokenError();
  }

  if (error.name === "TokenExpiredError") {
    return new TokenExpiredError();
  }

  // Default to internal error
  return new AppError(
    "An unexpected error occurred",
    500,
    "INTERNAL_ERROR",
    false
  );
}

export default {
  AppError,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  AuthorizationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
  RateLimitError,
  AccountLockedError,
  DatabaseError,
  DuplicateKeyError,
  ExternalServiceError,
  EncryptionError,
  DecryptionError,
  FileUploadError,
  FileSizeTooLargeError,
  InvalidFileTypeError,
  InsufficientPermissionsError,
  InvalidOperationError,
  isOperationalError,
  toAppError,
};
