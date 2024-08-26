import express from "express";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes";
import { handleError } from "./shared/helper";
import { corsOptions } from "./config/corsConfig";
import "./config/passport-config";
import dotenv from "dotenv";

dotenv.config();

function configureExpressApp(): express.Application {
  const app = express();

  app.use(
    session({
      secret: process.env.SECRET_KEY!,
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use("/v1", routes);
  app.use(handleError);

  return app;
}

export { configureExpressApp };
