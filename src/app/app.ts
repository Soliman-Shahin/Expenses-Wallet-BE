import express from "express";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { 
  trackSyncOperation, 
  handleSyncError, 
  validateSyncData, 
  rateLimitSync, 
  addSyncHeaders 
} from "./middleware/sync.middleware";
import { corsOptions } from "./config/corsConfig";
import "./config/passport-config";
import dotenv from "dotenv";

dotenv.config();

function configureExpressApp(): express.Application {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SECRET_KEY || process.env.JWT_SECRET;

  if (!sessionSecret) {
    console.warn(
      "[server]: SESSION secret is not set. Please set SECRET_KEY or JWT_SECRET in environment variables."
    );
  }

  // Needed for secure cookies when behind a proxy (Railway/Render/Heroku)
  app.set("trust proxy", 1);

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
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Sync middleware
  app.use(trackSyncOperation);
  app.use(validateSyncData);
  app.use(rateLimitSync(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
  app.use(addSyncHeaders);
  
  app.use("/v1", routes);
  app.use(handleSyncError);
  app.use(errorHandler);

  return app;
}

export { configureExpressApp };
