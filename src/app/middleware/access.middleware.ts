import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '51778657246321226641fsdklafjasdkljfsklfjd7148924065';

export const verifyAccessToken = (req: Request & { user_id?: string }, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    // Attach user id to request for downstream use
    req.user_id = (payload as any)._id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
};
