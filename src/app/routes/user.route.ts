import { Request, RequestHandler, Response, Router } from "express";
import passport from "passport";
import { User } from "../models/user.model";
import https from "https";
import { sendSuccess } from "../shared/helper";
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
import { validateRequestWithJoi, verifySession } from "../middleware";
import { loginSchema, signUpSchema } from "../validations/user.validation";
import multer from "multer";
import { strictAuthRateLimiter } from "../middleware/rate-limit.middleware";
import { checkBruteForce } from "../middleware/brute-force.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Routes for local authentication with rate limiting and brute force protection
router.post(
  "/signup",
  strictAuthRateLimiter,
  checkBruteForce,
  validateRequestWithJoi(signUpSchema),
  signUp
);
router.post(
  "/login",
  strictAuthRateLimiter,
  checkBruteForce,
  validateRequestWithJoi(loginSchema),
  login
);
router.post("/refresh-token", refreshToken);

// Native Google Sign-In (Android/iOS) using idToken from Capacitor plugin
router.post("/auth/google/native", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "idToken is required" });
    }

    // Verify idToken with Google tokeninfo (with fetch fallback)
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken
    )}`;
    const fetchFn: any = (globalThis as any).fetch;
    let info: any;
    try {
      if (typeof fetchFn === "function") {
        const resp = await fetchFn(url);
        if (!resp.ok) {
          console.warn("[google/native] tokeninfo resp not ok", resp.status);
          return res.status(401).json({ message: "Invalid Google idToken" });
        }
        info = await resp.json();
      } else {
        // Fallback using https
        info = await new Promise((resolve, reject) => {
          https
            .get(url, (r) => {
              let data = "";
              r.on("data", (chunk) => (data += chunk));
              r.on("end", () => {
                try {
                  const json = JSON.parse(data);
                  if ((r.statusCode || 0) >= 200 && (r.statusCode || 0) < 300) {
                    resolve(json);
                  } else {
                    console.warn(
                      "[google/native] https tokeninfo bad status",
                      r.statusCode
                    );
                    reject(new Error("Invalid Google idToken"));
                  }
                } catch (e) {
                  reject(e);
                }
              });
            })
            .on("error", reject);
        });
      }
    } catch (e) {
      console.error("[google/native] tokeninfo fetch error", e);
      return res.status(500).json({ message: "Token verification failed" });
    }

    // Optional audience check if env is set
    const expectedAud = process.env.GOOGLE_WEB_CLIENT_ID;
    if (expectedAud && info?.aud !== expectedAud) {
      console.warn("[google/native] audience mismatch", {
        aud: info?.aud,
        expectedAud,
      });
      return res.status(401).json({ message: "Invalid token audience" });
    }

    const sub = info?.sub as string | undefined;
    const email = info?.email as string | undefined;
    const emailVerified =
      info?.email_verified === "true" || info?.email_verified === true;
    const name = (info?.name as string) || undefined;
    const picture = (info?.picture as string) || undefined;

    if (!sub || !email) {
      console.warn("[google/native] missing fields", {
        hasSub: !!sub,
        hasEmail: !!email,
      });
      return res.status(400).json({ message: "Missing Google profile fields" });
    }

    // Find or create user by socialId or email
    let user = await User.findOne({ $or: [{ socialId: sub }, { email }] });
    if (!user) {
      user = new (User as any)({
        signupType: "google",
        socialId: sub,
        email,
        username: name,
        image: picture,
        emailVerified,
      });
      await (user as any).save();
    } else {
      // Update profile data if changed
      let mutated = false;
      if (!user.socialId) {
        (user as any).socialId = sub;
        mutated = true;
      }
      if (name && user.username !== name) {
        (user as any).username = name;
        mutated = true;
      }
      if (picture && user.image !== picture) {
        (user as any).image = picture;
        mutated = true;
      }
      if (emailVerified !== undefined && user.emailVerified !== emailVerified) {
        (user as any).emailVerified = emailVerified;
        mutated = true;
      }
      if (mutated) await (user as any).save();
    }

    const refreshToken = await (user as any).createSession();
    const accessToken = await (user as any).generateAccessAuthToken();

    const rawUser = (user as any).toJSON ? (user as any).toJSON() : user;
    const { password, sessions, ...safeUser } = rawUser;

    return sendSuccess(
      res,
      {
        user: safeUser,
        tokens: { accessToken, refreshToken },
      },
      "Authentication successful"
    );
  } catch (err) {
    return res.status(500).json({ message: "Authentication processing error" });
  }
});
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

      const mobileRedirect = process.env.MOBILE_OAUTH_REDIRECT || "";
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
          // Web/SPA popup flow
          if (window.opener && typeof window.opener.postMessage === 'function') {
            window.opener.postMessage({ type: 'google-auth-success', payload: data }, '*');
          } else if ('${mobileRedirect}') {
            // Mobile deep link fallback for Android/iOS
            var b64 = btoa(JSON.stringify(data));
            var target = '${mobileRedirect}'.replace(/[#?]*$/, '') + '#payload=' + encodeURIComponent(b64);
            window.location.replace(target);
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

      const mobileRedirect = process.env.MOBILE_OAUTH_REDIRECT || "";
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
          } else if ('${mobileRedirect}') {
            var b64 = btoa(JSON.stringify(data));
            var target = '${mobileRedirect}'.replace(/[#?]*$/, '') + '#payload=' + encodeURIComponent(b64);
            window.location.replace(target);
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
