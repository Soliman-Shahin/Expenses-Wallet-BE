import { Request, RequestHandler, Response, Router } from 'express';
import passport from 'passport';
import { login, signUp, userAccessToken } from '../controllers';
import { validateRequest, verifySession } from '../middleware';
import { loginSchema, signUpSchema } from '../validations/user.validation';

const router = Router();

// Routes for local authentication
router.post('/signup', validateRequest(signUpSchema), signUp);
router.post('/login', validateRequest(loginSchema), login);
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
