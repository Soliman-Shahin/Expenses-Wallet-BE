import crypto from "crypto";

/**
 * Advanced Encryption/Decryption Utility
 * Uses AES-256-GCM for stronger security with authenticated encryption
 * Generates unique IV for each encryption operation
 *
 * Security Features:
 * - AES-256-GCM (Galois/Counter Mode) - provides both confidentiality and authenticity
 * - Unique IV (Initialization Vector) per encryption
 * - Authentication tag for data integrity
 * - Base64 encoding for safe transport
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes authentication tag
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment or generate one
 * In production, always use environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn(
      "⚠️  ENCRYPTION_KEY not set in environment variables. Using default (INSECURE for production)"
    );
    // Default key for development only - NEVER use in production
    return crypto.scryptSync("ExpensesWalletSecretKey2024", "salt", 32);
  }

  // Derive a 32-byte key from the environment variable using PBKDF2
  // This matches the Web Crypto API implementation in the frontend
  return crypto.pbkdf2Sync(
    key,
    "expenses-wallet-salt",
    100000, // Iterations
    32, // Key length (32 bytes = 256 bits)
    "sha256" // Digest
  );
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt data using AES-256-GCM
 * @param data - Any data to encrypt (will be JSON stringified)
 * @returns Encrypted string in format: iv:authTag:encryptedData (base64 encoded)
 */
export function encryptAdvanced(data: any): string {
  if (!data) return "";

  try {
    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher - using 'as any' to bypass TypeScript Buffer compatibility issue
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      ENCRYPTION_KEY as any,
      iv as any
    );

    // Encrypt the data
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Encrypted Data (all base64 encoded)
    const result = `${iv.toString("base64")}:${authTag.toString(
      "base64"
    )}:${encrypted}`;

    return result;
  } catch (error) {
    console.error("❌ Encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted and parsed data
 */
export function decryptAdvanced(encryptedData: string): any {
  if (!encryptedData) return null;

  try {
    // Split the encrypted data into components
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = parts[2];

    // Create decipher - using 'as any' to bypass TypeScript Buffer compatibility issue
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY as any,
      iv as any
    );
    decipher.setAuthTag(authTag as any);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    // Parse and return
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    return null;
  }
}

/**
 * Hash sensitive data (one-way)
 * Useful for tokens, passwords verification, etc.
 */
export function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate random token
 * @param length - Length in bytes (default 32)
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Encrypt only specific fields in an object
 * @param obj - Object containing fields to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptAdvanced(result[field]) as any;
    }
  }

  return result;
}

/**
 * Decrypt only specific fields in an object
 * @param obj - Object containing encrypted fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === "string") {
      const decrypted = decryptAdvanced(result[field] as string);
      if (decrypted !== null) {
        result[field] = decrypted;
      }
    }
  }

  return result;
}

export default {
  encrypt: encryptAdvanced,
  decrypt: decryptAdvanced,
  hash: hashData,
  generateToken: generateSecureToken,
  encryptFields,
  decryptFields,
  encryptFieldsDeep,
  decryptFieldsDeep,
};

/**
 * Recursively encrypt specific fields in an object
 * @param obj - Object containing fields to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 */
export function encryptFieldsDeep<T extends any>(
  obj: T,
  fieldsToEncrypt: string[]
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      encryptFieldsDeep(item, fieldsToEncrypt)
    ) as unknown as T;
  }

  const result = { ...obj } as any;

  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      if (fieldsToEncrypt.includes(key)) {
        // Encrypt this field if it's not already encrypted
        const value = result[key];
        if (
          value !== undefined &&
          value !== null &&
          typeof value !== "string" // Assuming encrypted values are strings
        ) {
          result[key] = encryptAdvanced(value);
        } else if (typeof value === "string" && !value.includes(":")) {
          // If it's a string but doesn't look like our encryption format, encrypt it
          // Note: This is a heuristic. Ideally we'd have a stricter check.
          result[key] = encryptAdvanced(value);
        }
      } else if (typeof result[key] === "object") {
        // Recurse
        result[key] = encryptFieldsDeep(result[key], fieldsToEncrypt);
      }
    }
  }

  return result;
}

/**
 * Recursively decrypt specific fields in an object
 * @param obj - Object containing encrypted fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 */
export function decryptFieldsDeep<T extends any>(
  obj: T,
  fieldsToDecrypt: string[]
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      decryptFieldsDeep(item, fieldsToDecrypt)
    ) as unknown as T;
  }

  const result = { ...obj } as any;

  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      if (fieldsToDecrypt.includes(key)) {
        const value = result[key];
        if (typeof value === "string" && value.includes(":")) {
          const decrypted = decryptAdvanced(value);
          if (decrypted !== null) {
            result[key] = decrypted;
          }
        }
      } else if (typeof result[key] === "object") {
        // Recurse
        result[key] = decryptFieldsDeep(result[key], fieldsToDecrypt);
      }
    }
  }

  return result;
}
