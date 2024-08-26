import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import passport from 'passport';
import { login, signUp, userAccessToken } from '../controllers';
import { User, UserDocument } from '../models';

const router = Router();

interface CustomRequest extends Request {
  user_id: string;
  userObject: UserDocument;
  refreshToken: string;
}

// Define middleware function to verify refresh token
const verifySession = async (req: CustomRequest, res: Response, next: NextFunction) => {
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

// Routes for local authentication
router.post('/signup', signUp);
router.post('/login', login);
router.get(
  '/access-token',
  verifySession as unknown as RequestHandler,
  userAccessToken as unknown as RequestHandler
);

// Routes for Google authentication
// router.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login'],
  })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req: Request, res: Response) => {
    res.redirect('/');
  }
);

// Facebook Authentication Route
router.get('/auth/facebook', passport.authenticate('facebook'));
router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    res.redirect('/');
  }
);

export default router;
