import express, { Request, Response } from "express";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import routes from "./routes";
import { errorHandler } from "./middleware/error-handler";
import {
  trackSyncOperation,
  handleSyncError,
  validateSyncData,
  rateLimitSync,
  addSyncHeaders,
} from "./middleware/sync.middleware";
import { corsOptions } from "./config/corsConfig";
import "./config/passport-config";
import dotenv from "dotenv";
import { advancedEncryptionMiddleware } from "./middleware/encryption-advanced.middleware";
import mongoSanitize from "express-mongo-sanitize";
import { requestLogger } from "./middleware/request-logger.middleware";

dotenv.config();
function configureExpressApp(): express.Application {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SECRET_KEY;

  if (!sessionSecret) {
    throw new Error(
      "[server]: SECRET_KEY is required for session management. " +
      "Please set it in your .env file. " +
      "Generate a secure key with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }

  // Needed for secure cookies when behind a proxy (Railway/Render/Heroku)
  app.set("trust proxy", 1);

  // Enable gzip compression for all responses
  app.use(compression());

  // Request/Response logging
  app.use(requestLogger);

  app.use(
    session({
      secret: sessionSecret as string,
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction, // requires HTTPS when true
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  
  // Add COOP headers to allow OAuth popup communication
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
  });
  
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Sanitize data to prevent NoSQL injection
  app.use(mongoSanitize());

  // Encryption Middleware (supports both full payload and field-level encryption)
  app.use(advancedEncryptionMiddleware);

  // Sync middleware
  app.use(trackSyncOperation);
  app.use(validateSyncData);
  app.use(rateLimitSync(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
  app.use(addSyncHeaders);

  app.use("/v1", routes);

  // OAuth callback bridge for mobile apps
  // Redirects from browser back to the native app using custom URL scheme
  app.get('/auth/callback', (req: Request, res: Response) => {
    const data = req.query.data as string;
    // Use hash (#payload) to match the app's deep-link handler
    const appUrl = `com.shahin.expenseswallet://oauth2redirect${
      data ? `#payload=${encodeURIComponent(data)}` : ''
    }`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirecting to Expenses Wallet...</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .container { text-align: center; padding: 20px; }
          h2 { color: #333; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #ddd; border-top-color: #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
          a { color: #4CAF50; text-decoration: none; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
        <script>
          window.location.href = "${appUrl}";
          setTimeout(() => { window.close(); }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Opening Expenses Wallet...</h2>
          <p>If the app doesn't open automatically, <a href="${appUrl}">tap here</a>.</p>
        </div>
      </body>
      </html>
    `);
  });

  app.use(handleSyncError);
  app.use(errorHandler);

  return app;
}

export { configureExpressApp };
