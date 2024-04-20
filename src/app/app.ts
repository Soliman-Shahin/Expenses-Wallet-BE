import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes";
import { handleError } from "./shared/helper";
import { corsOptions } from "./config/corsConfig";
import passport from "passport";
import "./config/passport-config";

function configureExpressApp(): express.Application {
  const app = express();

  app.use(passport.initialize());

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use("/v1", routes);
  app.use(handleError);

  return app;
}

export { configureExpressApp };
