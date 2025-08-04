import { Response } from 'express';
import { omit } from 'lodash';
import { UserDocument } from '../../models';
import { sendSuccess } from './api-response';

// Helper function for generating tokens
const generateTokens = async (user: UserDocument) => {
  const refreshToken = await user.createSession();
  const accessToken = await user.generateAccessAuthToken();
  return { refreshToken, accessToken };
};

// Helper function for sending user and tokens
const sendUserAndTokens = async (res: Response, user: UserDocument) => {
  const tokens = await generateTokens(user);
  const userResponse = {
    user: omit(user.toJSON(), ['password', 'sessions']),
    tokens,
  };
  sendSuccess(res, userResponse, 'Authentication successful');
};

export { sendUserAndTokens };
