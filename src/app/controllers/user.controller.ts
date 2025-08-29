import { Response } from "express";
import { sendError, sendSuccess } from "../shared/helper";
import { CustomRequest } from "../types/custom-request";
import { UserService } from "../services/user.service";
import { User, Category } from "../models";
import bcrypt from "bcryptjs";

const { SALT_ROUNDS } = process.env;
type UserCredentials = { email: string; password: string };

// POST /signup
const signUp = async (req: CustomRequest, res: Response) => {
  try {
    const { email, password } = req.body as UserCredentials;
    // Check if user exists
    const existingUser = await UserService.validateUserCredentials(
      email,
      password
    ).catch(() => null);
    if (existingUser) {
      return sendError(res, "Email already used", 409);
    }
    const hashedPassword = await bcrypt.hash(password, Number(SALT_ROUNDS));
    // Create user
    const user = await UserService.createUser(email, hashedPassword);
    // Create a default category for the new user
    await Category.create({
      title: 'Uncategorized',
      icon: 'help-circle-outline',
      color: '#9E9E9E',
      type: 'outcome',
      user: user._id,
      isDefault: true,
    });
    // Generate tokens
    const accessToken = await UserService.generateAccessToken(user);
    const refreshToken = await UserService.generateRefreshToken();
    await UserService.addRefreshToken(user, refreshToken);
    // Also return tokens in headers for legacy frontend compatibility
    res.setHeader("access-token", accessToken);
    res.setHeader("refresh-token", refreshToken);
    sendSuccess(res, { user, accessToken, refreshToken }, "Signup successful");
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
    // Also return tokens in headers for legacy frontend compatibility
    res.setHeader("access-token", accessToken);
    res.setHeader("refresh-token", refreshToken);
    sendSuccess(res, { user, accessToken, refreshToken }, "Login successful");
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

// GET /users/me/access-token
const userAccessToken = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.userObject) {
      return sendError(res, "User not found in request", 401);
    }
    const accessToken = await UserService.generateAccessToken(req.userObject);
    // Mirror in header for clients that read headers
    res.setHeader("access-token", accessToken);
    sendSuccess(res, { accessToken }, "Access token generated successfully");
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// POST /refresh-token
const refreshToken = async (req: CustomRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, "Refresh token required", 400);
    }
    // Find user by hashed refresh token
    const user = await UserService.findByRefreshToken(refreshToken);
    if (!user) {
      return sendError(res, "Invalid refresh token", 401);
    }
    // Find the session
    const hashed = require("crypto")
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const session = user.sessions.find((s) => s.token === hashed);
    if (!session) {
      return sendError(res, "Session not found", 401);
    }
    // Check if expired
    if (session.expiresAt < Date.now() / 1000) {
      await UserService.removeRefreshToken(user, refreshToken);
      return sendError(res, "Refresh token expired", 401);
    }
    // Rotate refresh token: remove old, add new
    await UserService.removeRefreshToken(user, refreshToken);
    const newRefreshToken = await UserService.generateRefreshToken();
    await UserService.addRefreshToken(user, newRefreshToken);
    // Generate new access token
    const accessToken = await UserService.generateAccessToken(user);
    // Expose in headers as well
    res.setHeader("access-token", accessToken);
    res.setHeader("refresh-token", newRefreshToken);
    res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    sendError(res, error.message, 401);
  }
};

export { login, signUp, userAccessToken, refreshToken };

// GET /user/me
const getMe = async (
  req: CustomRequest & { user_id?: string },
  res: Response
) => {
  try {
    const userId = req.user_id;
    if (!userId) return sendError(res, "Unauthorized", 401);
    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found", 404);
    // Normalize salary in response to array shape for legacy documents
    const obj: any = user.toJSON();
    if (typeof obj.salary === "number") {
      obj.salary = [{ label: "Salary", amount: obj.salary }];
    }
    return sendSuccess(res, obj, "User fetched successfully");
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// PUT /user/me
const updateMe = async (
  req: CustomRequest & { user_id?: string },
  res: Response
) => {
  try {
    const userId = req.user_id;
    if (!userId) return sendError(res, "Unauthorized", 401);

    // Normalize: if fullName is provided without username, use it as username
    if ((req.body as any)?.fullName && !(req.body as any)?.username) {
      (req.body as any).username = (req.body as any).fullName;
    }

    const allowed: Array<keyof typeof req.body> = [
      // We deliberately omit 'fullName' from persistence to standardize on 'username'
      "phone",
      "salary",
      "currency",
      "username",
      "image",
    ];

    const updatePayload: any = {};
    // Coerce numeric salary into array shape if provided
    if (req.body && (req.body as any).salary !== undefined) {
      const incoming = (req.body as any).salary;
      if (typeof incoming === "number") {
        (req.body as any).salary = [{ label: "Salary", amount: incoming }];
      }
    }
    for (const key of allowed) {
      if (req.body[key] !== undefined) updatePayload[key] = req.body[key];
    }

    const updated = await User.findByIdAndUpdate(userId, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!updated) return sendError(res, "User not found", 404);
    return sendSuccess(res, updated, "User updated successfully");
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

export { getMe, updateMe };

// POST /user/me/avatar
const uploadAvatar = async (
  req: CustomRequest & { user_id?: string; file?: any; files?: any[] },
  res: Response
) => {
  try {
    const userId = req.user_id;
    if (!userId) return sendError(res, "Unauthorized", 401);
    let file: any = (req as any).file;
    if (
      !file &&
      Array.isArray((req as any).files) &&
      (req as any).files.length > 0
    ) {
      file = (req as any).files[0];
    }
    if (!file) return sendError(res, "No file uploaded", 400);

    // Convert to Data URL for quick dev. In production, store to object storage or disk.
    const base64 = file.buffer.toString("base64");
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    const updated = await User.findByIdAndUpdate(
      userId,
      { image: dataUrl },
      { new: true }
    );
    if (!updated) return sendError(res, "User not found", 404);

    // Return in a shape the frontend can understand
    return sendSuccess(
      res,
      { avatarUrl: updated.image, user: updated },
      "Avatar updated"
    );
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

export { uploadAvatar };
