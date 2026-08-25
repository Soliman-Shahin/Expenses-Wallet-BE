/**
 * User-related type definitions
 */

import { Request } from 'express';
import { UserRole } from '../models/user.model';

/**
 * User credentials for login/signup
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * User update payload
 */
export interface UserUpdatePayload {
  username?: string;
  fullName?: string;
  phone?: string;
  salary?: Array<{ label: string; amount: number }> | number;
  currency?: string;
  image?: string;
}

/**
 * User JSON response (without sensitive fields)
 */
export interface UserResponse {
  _id: string;
  email: string;
  username?: string;
  fullName?: string;
  phone?: string;
  salary?: Array<{ label: string; amount: number }>;
  currency?: string;
  image?: string;
  signupType: 'normal' | 'google' | 'facebook';
  emailVerified?: boolean;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * File upload from multer
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
  buffer: Buffer; // For memory storage
}

/**
 * Request with file upload
 */
export interface RequestWithFile {
  user_id?: string;
  file?: UploadedFile;
  files?: UploadedFile[];
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, unknown>;
}

/**
 * Error with additional context
 */
export interface ErrorWithContext extends Error {
  statusCode?: number;
  context?: Record<string, unknown>;
  code?: string;
}

/**
 * Type guard to check if error is Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
