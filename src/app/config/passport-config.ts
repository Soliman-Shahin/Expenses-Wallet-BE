import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { User } from "../models";
import dotenv from "dotenv";

// Initialize dotenv to use environment variables
dotenv.config();

//  sign up with google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await User.findOne({ socialId: profile.id });
        if (user) {
          done(null, user);
        } else {
          //   create user
          const newUser = new User({
            socialId: profile.id,
            signupType: profile.provider,
            email: profile._json.email,
            username: profile.displayName,
            image: "profile.png",
          });
          // Saving user
          await newUser.save();
          done(null, newUser);
        }
      } catch (err: any) {
        console.log(err);
        done(err);
      }
    }
  )
);

// sign up with facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ["id", "displayName", "email", "picture.type(large)"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await User.findOne({ socialId: profile.id });
        if (user) {
          done(null, user);
        } else {
          //   create user
          const newUser = new User({
            socialId: profile.id,
            signupType: profile.provider,
            email: profile._json.email,
            username: profile.displayName,
            image: "profile.png",
          });
          // Saving user
          await newUser.save();
          done(null, newUser);
        }
      } catch (err: any) {
        console.log(err);
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});
