import { User, UserDocument } from "../models/user.model";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "default_access_secret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret";
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || "10",
  10
);

// Hash a refresh token before storing in DB
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class UserService {
  // Create a new user
  static async createUser(
    email: string,
    hashedPassword: string
  ): Promise<UserDocument> {
    const user = new User({ email, password: hashedPassword });
    await user.save();
    return user;
  }

  // Validate user credentials
  static async validateUserCredentials(
    email: string,
    password: string
  ): Promise<UserDocument> {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) throw new Error("Invalid Password");
    return user;
  }

  // Generate access token
  static async generateAccessToken(user: UserDocument): Promise<string> {
    return jwt.sign({ _id: user._id }, ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
      algorithm: "HS256",
    });
  }

  // Generate a secure refresh token
  static async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(64).toString("hex");
  }

  // Add a refresh token (hashed) to the user, remove expired/used tokens
  static async addRefreshToken(
    user: UserDocument,
    refreshToken: string
  ): Promise<void> {
    const hashed = hashToken(refreshToken);
    const expiresAt =
      Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    user.sessions = (user.sessions || []).filter(
      (s) => s.expiresAt > Date.now() / 1000
    );
    user.sessions.push({ token: hashed, expiresAt });
    await user.save();
  }

  // Remove a refresh token (on logout or rotation)
  static async removeRefreshToken(
    user: UserDocument,
    refreshToken: string
  ): Promise<void> {
    const hashed = hashToken(refreshToken);
    user.sessions = (user.sessions || []).filter((s) => s.token !== hashed);
    await user.save();
  }

  // Find user by refresh token (hashed)
  static async findByRefreshToken(
    refreshToken: string
  ): Promise<UserDocument | null> {
    const hashed = hashToken(refreshToken);
    return User.findOne({ "sessions.token": hashed });
  }

  // Remove all refresh tokens (on password change, etc)
  static async removeAllRefreshTokens(user: UserDocument): Promise<void> {
    user.sessions = [];
    await user.save();
  }
}
