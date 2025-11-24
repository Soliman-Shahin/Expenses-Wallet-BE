/**
 * Password Validation Service
 *
 * Features:
 * - Configurable password strength requirements
 * - Common password detection
 * - Password entropy calculation
 * - Detailed validation feedback
 * - Password strength scoring
 */

export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars?: number;
  minNumbers?: number;
  preventCommonPasswords: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: "weak" | "fair" | "good" | "strong" | "very-strong";
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

const defaultRequirements: PasswordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  minNumbers: 1,
  preventCommonPasswords: true,
};

// Common passwords to prevent (top 100 most common)
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "monkey",
  "1234567",
  "letmein",
  "trustno1",
  "dragon",
  "baseball",
  "iloveyou",
  "master",
  "sunshine",
  "ashley",
  "bailey",
  "passw0rd",
  "shadow",
  "123123",
  "654321",
  "superman",
  "qazwsx",
  "michael",
  "football",
  "password1",
  "123456789",
  "welcome",
  "admin",
  "changeme",
  "test",
  "guest",
  "demo",
  "user",
  "root",
  "default",
];

export class PasswordValidator {
  private requirements: PasswordRequirements;

  constructor(customRequirements?: Partial<PasswordRequirements>) {
    this.requirements = { ...defaultRequirements, ...customRequirements };
  }

  /**
   * Validate password against requirements
   */
  public validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check length
    if (password.length < this.requirements.minLength) {
      errors.push(
        `Password must be at least ${this.requirements.minLength} characters long`
      );
    } else {
      score += 10;
    }

    if (password.length > this.requirements.maxLength) {
      errors.push(
        `Password must not exceed ${this.requirements.maxLength} characters`
      );
    }

    // Check for uppercase
    if (this.requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
      suggestions.push("Add at least one uppercase letter (A-Z)");
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    // Check for lowercase
    if (this.requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
      suggestions.push("Add at least one lowercase letter (a-z)");
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    // Check for numbers
    const numberCount = (password.match(/[0-9]/g) || []).length;
    if (this.requirements.requireNumbers && numberCount === 0) {
      errors.push("Password must contain at least one number");
      suggestions.push("Add at least one number (0-9)");
    } else if (numberCount > 0) {
      score += 15;
      if (
        this.requirements.minNumbers &&
        numberCount >= this.requirements.minNumbers
      ) {
        score += 5;
      }
    }

    // Check for special characters
    const specialChars = password.match(/[^A-Za-z0-9]/g) || [];
    const specialCharCount = specialChars.length;

    if (this.requirements.requireSpecialChars && specialCharCount === 0) {
      errors.push("Password must contain at least one special character");
      suggestions.push("Add at least one special character (!@#$%^&*)");
    } else if (specialCharCount > 0) {
      score += 15;
      if (
        this.requirements.minSpecialChars &&
        specialCharCount >= this.requirements.minSpecialChars
      ) {
        score += 5;
      }
    }

    // Check for common passwords
    if (this.requirements.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (COMMON_PASSWORDS.includes(lowerPassword)) {
        errors.push("This password is too common and easily guessable");
        suggestions.push("Choose a more unique password");
        score = Math.min(score, 20); // Cap score for common passwords
      }
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      suggestions.push('Avoid sequential characters (e.g., "123", "abc")');
      score -= 5;
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      suggestions.push('Avoid repeated characters (e.g., "aaa", "111")');
      score -= 5;
    }

    // Bonus for length
    if (password.length >= 12) {
      score += 10;
    }
    if (password.length >= 16) {
      score += 10;
    }

    // Calculate entropy bonus
    const entropy = this.calculateEntropy(password);
    if (entropy > 50) score += 10;
    if (entropy > 70) score += 10;

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: PasswordValidationResult["strength"];
    if (score < 30) strength = "weak";
    else if (score < 50) strength = "fair";
    else if (score < 70) strength = "good";
    else if (score < 90) strength = "strong";
    else strength = "very-strong";

    return {
      isValid: errors.length === 0,
      strength,
      score,
      errors,
      suggestions,
    };
  }

  /**
   * Check for sequential characters (123, abc, etc.)
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      "0123456789",
      "abcdefghijklmnopqrstuvwxyz",
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm",
    ];
    const lowerPassword = password.toLowerCase();

    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 3; i++) {
        const subseq = seq.substring(i, i + 3);
        if (
          lowerPassword.includes(subseq) ||
          lowerPassword.includes(subseq.split("").reverse().join(""))
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for repeated characters (aaa, 111, etc.)
   */
  private hasRepeatedChars(password: string): boolean {
    return /(.)\1{2,}/.test(password);
  }

  /**
   * Calculate password entropy (randomness)
   */
  private calculateEntropy(password: string): number {
    const charsetSize = this.getCharsetSize(password);
    const length = password.length;
    return length * Math.log2(charsetSize);
  }

  /**
   * Determine charset size based on character types used
   */
  private getCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26; // lowercase
    if (/[A-Z]/.test(password)) size += 26; // uppercase
    if (/[0-9]/.test(password)) size += 10; // numbers
    if (/[^A-Za-z0-9]/.test(password)) size += 32; // special chars (estimate)
    return size;
  }

  /**
   * Generate a strong random password
   */
  public generateStrongPassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = uppercase + lowercase + numbers + special;
    let password = "";

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}

// Export singleton instance with default requirements
export const passwordValidator = new PasswordValidator();

/**
 * Quick validation helper
 */
export function validatePassword(password: string): PasswordValidationResult {
  return passwordValidator.validate(password);
}

/**
 * Generate strong password
 */
export function generatePassword(length: number = 16): string {
  return passwordValidator.generateStrongPassword(length);
}

export default passwordValidator;
