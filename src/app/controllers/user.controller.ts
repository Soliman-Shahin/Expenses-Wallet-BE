import { Response } from 'express';
import { sendError, sendSuccess } from '../shared/helper';
import { CustomRequest } from '../types/custom-request';
import { UserService } from '../services/user.service';
import bcrypt from 'bcryptjs';

const { SALT_ROUNDS } = process.env;
type UserCredentials = { email: string; password: string };

// POST /signup
const signUp = async (req: CustomRequest, res: Response) => {
  try {
    const { email, password } = req.body as UserCredentials;
    // Check if user exists
    const existingUser = await UserService.validateUserCredentials(email, password).catch(() => null);
    if (existingUser) {
      return sendError(res, 'Email already used', 409);
    }
    const hashedPassword = await bcrypt.hash(password, Number(SALT_ROUNDS));
    // Create user
    const user = await UserService.createUser(email, hashedPassword);
    // Generate tokens
    const accessToken = await UserService.generateAccessToken(user);
    const refreshToken = await UserService.generateRefreshToken();
    await UserService.addRefreshToken(user, refreshToken);
    sendSuccess(res, { user, accessToken, refreshToken }, 'Signup successful');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// POST /users/login
const login = async (req: CustomRequest, res: Response) => {
  try {
    const { email, password } = req.body as UserCredentials;
    const user = await UserService.validateUserCredentials(email, password);
    const accessToken = await UserService.generateAccessToken(user);
    const refreshToken = await UserService.generateRefreshToken();
    await UserService.addRefreshToken(user, refreshToken);
    sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful');
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

// GET /users/me/access-token
const userAccessToken = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.userObject) {
      return sendError(res, 'User not found in request', 401);
    }
    const accessToken = await UserService.generateAccessToken(req.userObject);
    sendSuccess(res, { accessToken }, 'Access token generated successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// POST /refresh-token
const refreshToken = async (req: CustomRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }
    // Find user by hashed refresh token
    const user = await UserService.findByRefreshToken(refreshToken);
    if (!user) {
      return sendError(res, 'Invalid refresh token', 401);
    }
    // Find the session
    const hashed = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
    const session = user.sessions.find(s => s.token === hashed);
    if (!session) {
      return sendError(res, 'Session not found', 401);
    }
    // Check if expired
    if (session.expiresAt < Date.now() / 1000) {
      await UserService.removeRefreshToken(user, refreshToken);
      return sendError(res, 'Refresh token expired', 401);
    }
    // Rotate refresh token: remove old, add new
    await UserService.removeRefreshToken(user, refreshToken);
    const newRefreshToken = await UserService.generateRefreshToken();
    await UserService.addRefreshToken(user, newRefreshToken);
    // Generate new access token
    const accessToken = await UserService.generateAccessToken(user);
    res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

export { login, signUp, userAccessToken, refreshToken };
