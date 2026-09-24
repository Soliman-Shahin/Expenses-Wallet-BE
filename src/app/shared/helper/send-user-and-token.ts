import { Response } from 'express';
import { omit } from 'lodash';
import { UserDocument } from '../../models';
import { sendSuccess } from './api-response';
import { UserService } from '../../services/user.service';

// Helper function for generating tokens
// Helper function for sending user and tokens
const sendUserAndTokens = async (
  res: Response,
  user: UserDocument,
  authenticationMethod: 'biometric' = 'biometric'
) => {
  const tokens = await UserService.createAuthenticatedSession(
    user,
    authenticationMethod
  );
  const userResponse = {
    user: omit(user.toJSON(), ['password', 'sessions']),
    tokens,
  };
  sendSuccess(res, userResponse, 'Authentication successful');
};

export { sendUserAndTokens };
