import { Request } from 'express';
import { UserDocument } from '../models';

export interface CustomRequest extends Request {
  user_id?: string;
  userObject?: UserDocument;
  refreshToken?: string;
}
