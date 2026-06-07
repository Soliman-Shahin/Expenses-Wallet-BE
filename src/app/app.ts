import express from "express";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config";
import { conditionalCsrfProtection } from "./middleware/csrf.middleware";
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

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

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

  // API Documentation (Swagger UI)
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Expenses Wallet API Docs',
  }));

  // CSRF Protection (conditional - skips Bearer token routes and OAuth)
  app.use(conditionalCsrfProtection);

  app.use("/v1", routes);
  app.use(handleSyncError);
  app.use(errorHandler);

  return app;
}

export { configureExpressApp };
