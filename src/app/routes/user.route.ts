import { Request, RequestHandler, Response, Router } from "express";
import passport from "passport";
import {
  login,
  signUp,
  userAccessToken,
  refreshToken,
  getMe,
  updateMe,
  uploadAvatar,
} from "../controllers";
import { verifyAccessToken } from "../middleware/access.middleware";
import { validateRequest, verifySession } from "../middleware";
import { loginSchema, signUpSchema } from "../validations/user.validation";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Routes for local authentication
router.post("/signup", validateRequest(signUpSchema), signUp);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh-token", refreshToken);
router.get(
  "/access-token",
  verifySession as unknown as RequestHandler,
  userAccessToken as unknown as RequestHandler
);

// Current user profile
router.get(
  "/me",
  verifyAccessToken as unknown as RequestHandler,
  getMe as unknown as RequestHandler
);
router.put(
  "/me",
  verifyAccessToken as unknown as RequestHandler,
  updateMe as unknown as RequestHandler
);

// Avatar upload
router.post(
  "/me/avatar",
  verifyAccessToken as unknown as RequestHandler,
  upload.any() as unknown as RequestHandler,
  uploadAvatar as unknown as RequestHandler
);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  async (req: Request, res: Response) => {
    try {
      // Passport attaches the authenticated user to req.user
      const user: any = (req as any).user;
      if (!user) {
        return res.status(401).send("Authentication failed");
      }

      // Generate tokens using existing instance methods on the User model
      const refreshToken = await user.createSession();
      const accessToken = await user.generateAccessAuthToken();

      // Sanitize user object
      const rawUser = user.toJSON ? user.toJSON() : user;
      const { password, sessions, ...safeUser } = rawUser;

      // Prepare a minimal HTML that posts the tokens + user back to the opener (SPA)
      const payload = {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      };

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Signing in…</title>
  </head>
  <body>
    <script>
      (function() {
        try {
          var data = ${JSON.stringify(payload)};
          if (window.opener && typeof window.opener.postMessage === 'function') {
            window.opener.postMessage({ type: 'google-auth-success', payload: data }, '*');
          }
        } catch (e) {
          // noop
        } finally {
          window.close();
        }
      })();
    </script>
    You may close this window.
  </body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=UTF-8");
      return res.status(200).send(html);
    } catch (err) {
      return res.status(500).send("Authentication processing error");
    }
  }
);

// Facebook Authentication Routes (popup flow like Google)
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  })
);

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/", session: false }),
  async (req: Request, res: Response) => {
    try {
      const user: any = (req as any).user;
      if (!user) {
        return res.status(401).send("Authentication failed");
      }

      const refreshToken = await user.createSession();
      const accessToken = await user.generateAccessAuthToken();

      const rawUser = user.toJSON ? user.toJSON() : user;
      const { password, sessions, ...safeUser } = rawUser;

      const payload = {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      };

      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Signing in…</title>
  </head>
  <body>
    <script>
      (function() {
        try {
          var data = ${JSON.stringify(payload)};
          if (window.opener && typeof window.opener.postMessage === 'function') {
            window.opener.postMessage({ type: 'facebook-auth-success', payload: data }, '*');
          }
        } catch (e) {
          // noop
        } finally {
          window.close();
        }
      })();
    </script>
    You may close this window.
  </body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=UTF-8");
      return res.status(200).send(html);
    } catch (err) {
      return res.status(500).send("Authentication processing error");
    }
  }
);

export default router;
