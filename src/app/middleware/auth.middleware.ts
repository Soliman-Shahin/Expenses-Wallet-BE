import { NextFunction, Response } from 'express';
import { User, UserDocument } from '../models';
import { CustomRequest } from '../types/custom-request';

export const verifySession = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.header('refresh-token')!;
    const _id = req.header('_id')!;
    const user: UserDocument | null = await User.findByIdAndToken(_id, refreshToken);

    if (!user) {
      throw new Error(
        'User not found. Make sure that the refresh token and user id are correct'
      );
    }

    req.user_id = _id;
    req.userObject = user;
    req.refreshToken = refreshToken;

    const isSessionValid = user.sessions.some(
      (session: any) =>
        session.token === refreshToken && !User.hasRefreshTokenExpired(session.expiresAt)
    );

    if (isSessionValid) {
      next();
    } else {
      throw new Error('Refresh token has expired or the session is invalid');
    }
  } catch (error: any) {
    res.status(401).send({ error: error.message });
  }
};
