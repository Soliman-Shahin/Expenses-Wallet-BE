import { User, UserDocument } from '../models/user.model';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const configuredRefreshDays = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || '10',
  10
);

const REFRESH_TOKEN_EXPIRY_DAYS =
  Number.isFinite(configuredRefreshDays) && configuredRefreshDays > 0
    ? configuredRefreshDays
    : 10;

// Hash a refresh token before storing in DB
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class UserService {
  // Create a new user
  static async createUser(
    email: string,
    hashedPassword: string,
    extra: Record<string, unknown> = {}
  ): Promise<UserDocument> {
    const user = new User({ email, password: hashedPassword, ...extra });
    await user.save();
    return user;
  }

  // Validate user credentials
  static async validateUserCredentials(
    email: string,
    password: string
  ): Promise<UserDocument> {
    // Exclude large profile fields (e.g. base64 avatar) — loading them from
    // Atlas was adding 10-15s to every login for users with uploaded images.
    const user = await User.findOne({ email }).select('-image');
    if (!user) throw new Error('User not found');
    if (user._isDeleted) throw new Error('Account has been deleted');
    if (user.isActive === false) throw new Error('Account is deactivated');
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) throw new Error('Invalid Password');
    return user;
  }

  // Generate access token
  static async generateAccessToken(user: UserDocument): Promise<string> {
    return jwt.sign({ _id: user._id }, ACCESS_TOKEN_SECRET, {
      expiresIn: '1h',
      algorithm: 'HS256',
      jwtid: crypto.randomUUID(),
    });
  }

  // Generate a secure refresh token
  static async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(64).toString('hex');
  }

  // Add a hashed refresh credential without replacing another device session
  static async addRefreshToken(
    user: UserDocument,
    refreshToken: string
  ): Promise<void> {
    const hashed = hashToken(refreshToken);
    const expiresAt =
      Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    if (user._isDeleted || user.isActive === false)
      throw new Error('Account unavailable');
    await User.updateOne(
      { _id: user._id },
      {
        $pull: {
          sessions: { expiresAt: { $lte: Math.floor(Date.now() / 1000) } },
        },
      }
    );
    const result = await User.updateOne(
      { _id: user._id, _isDeleted: { $ne: true }, isActive: { $ne: false } },
      {
        $push: { sessions: { token: hashed, expiresAt } },
      }
    );
    if (!result.matchedCount) throw new Error('Account unavailable');
  }

  // Remove a refresh token (on logout or rotation)
  static async removeRefreshToken(
    user: UserDocument,
    refreshToken: string
  ): Promise<void> {
    const hashed = hashToken(refreshToken);
    await User.updateOne(
      { _id: user._id },
      { $pull: { sessions: { token: hashed } } }
    );
  }

  // Find user by refresh token (hashed)
  static async findByRefreshToken(
    refreshToken: string
  ): Promise<UserDocument | null> {
    const hashed = hashToken(refreshToken);
    return User.findOne({ 'sessions.token': hashed });
  }

  // One MongoDB update consumes the old credential and replaces it atomically.
  static async rotateRefreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (!/^[a-f0-9]{128}$/.test(refreshToken)) return null;
    // Read-only compatibility with pre-AUTH.1 Google sessions. Rotation replaces
    // the legacy plaintext value with a hash; no issuance path writes plaintext.
    const nextToken = await this.generateRefreshToken();
    const now = Math.floor(Date.now() / 1000);
    const user = await User.findOneAndUpdate(
      {
        _isDeleted: { $ne: true },
        isActive: { $ne: false },
        sessions: {
          $elemMatch: {
            token: { $in: [hashToken(refreshToken), refreshToken] },
            expiresAt: { $gt: now },
          },
        },
      },
      {
        $set: {
          'sessions.$.token': hashToken(nextToken),
          'sessions.$.expiresAt': now + REFRESH_TOKEN_EXPIRY_DAYS * 86400,
        },
      },
      { returnDocument: 'after' }
    );
    if (!user) return null;
    return {
      accessToken: await this.generateAccessToken(user),
      refreshToken: nextToken,
    };
  }

  static async revokeRefreshToken(refreshToken: string): Promise<void> {
    if (!/^[a-f0-9]{128}$/.test(refreshToken)) return;
    const accepted = [hashToken(refreshToken), refreshToken];
    await User.updateOne(
      { 'sessions.token': { $in: accepted } },
      {
        $pull: { sessions: { token: { $in: accepted } } },
      }
    );
  }

  // Remove all refresh tokens (on password change, etc)
  static async removeAllRefreshTokens(user: UserDocument): Promise<void> {
    user.sessions = [];
    await user.save();
  }

  static hashPasswordResetToken(token: string): string {
    return hashToken(token);
  }
}
