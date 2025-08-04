// Import the required modules
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User, UserDocument } from '../models';
import { sendError, sendSuccess, sendUserAndTokens } from '../shared/helper';
import { CustomRequest } from '../types/custom-request';

// Get the environment variables
const { SALT_ROUNDS } = process.env;

// Define a type for the user credentials
type UserCredentials = { email: string; password: string };

// Define a function to validate the user credentials
const validateUserCredentials = async (
  credentials: UserCredentials
): Promise<UserDocument> => {
  const { email, password } = credentials;
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error('Invalid Password');
  }
  return user;
};

// POST /signup
const signUp = async (req: CustomRequest, res: Response) => {
  try {
    const { email, password } = req.body as UserCredentials;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'Email already used', 409);
    }
    const hashedPassword = await bcrypt.hash(password, Number(SALT_ROUNDS));
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    await sendUserAndTokens(res, newUser);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// POST /users/login
const login = async (req: CustomRequest, res: Response) => {
  try {
    const credentials = req.body as UserCredentials;
    const user = await validateUserCredentials(credentials);
    await sendUserAndTokens(res, user);
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
    const accessToken = await req.userObject.generateAccessAuthToken();
    sendSuccess(res, { accessToken }, 'Access token generated successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export { login, signUp, userAccessToken };
