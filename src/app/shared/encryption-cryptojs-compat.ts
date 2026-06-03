import crypto from "crypto";
import CryptoJS from "crypto-js";

/**
 * CryptoJS-Compatible Encryption/Decryption
 * This matches the Frontend's CryptoJS.AES implementation
 */

/**
 * Get encryption key - must match Frontend
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn(
      "⚠️  ENCRYPTION_KEY not set. Using TEMP_TRANSPORT_KEY (matches Frontend)"
    );
    return "TEMP_TRANSPORT_KEY";
  }
  
  console.log("🔑 [CryptoJS] Using ENCRYPTION_KEY from env (length:", key.length, ")");
  // Frontend uses TEMP_TRANSPORT_KEY, so we should too if ENCRYPTION_KEY is set to something else
  // For now, always use TEMP_TRANSPORT_KEY to match Frontend
  return "TEMP_TRANSPORT_KEY";
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt data using CryptoJS format (compatible with Frontend)
 * @param data - Data to encrypt
 * @returns Encrypted string in CryptoJS format
 */
export function encryptCryptoJS(data: any): string {
  if (!data) return "";
  
  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      ENCRYPTION_KEY
    );
    return encrypted.toString();
  } catch (error) {
    console.error("❌ CryptoJS encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt data using CryptoJS format (compatible with Frontend)
 * @param encryptedData - Encrypted string from Frontend
 * @returns Decrypted data
 */
export function decryptCryptoJS(encryptedData: string): any {
  if (!encryptedData) return null;
  
  try {
    console.log("🔑 [CryptoJS] Decrypting with key:", ENCRYPTION_KEY);
    console.log("🔍 [CryptoJS] Encrypted data length:", encryptedData.length);
    
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    console.log("🔍 [CryptoJS] Decrypted string length:", decryptedData.length);
    console.log("🔍 [CryptoJS] Decrypted preview:", decryptedData.substring(0, 50));
    
    if (!decryptedData) {
      throw new Error("Decryption returned empty string - wrong key?");
    }
    
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error("❌ CryptoJS decryption failed:", error);
    throw error;
  }
}

/**
 * Check if data is in CryptoJS format
 */
export function isCryptoJSFormat(data: string): boolean {
  // CryptoJS format starts with "U2FsdGVkX1" (base64 of "Salted__")
  return typeof data === "string" && data.startsWith("U2FsdGVkX1");
}
