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
        // 1) If user already connected Google before, fetch by socialId
        const existingBySocial = await User.findOne({ socialId: profile.id });
        if (existingBySocial) {
          // Optionally refresh image/username if missing
          const photo =
            (profile.photos && profile.photos[0]?.value) || undefined;
          let updated = false;
          if (!existingBySocial.username && profile.displayName) {
            existingBySocial.username = profile.displayName;
            updated = true;
          }
          if (!existingBySocial.image && photo) {
            existingBySocial.image = photo;
            updated = true;
          }
          if (updated) await existingBySocial.save();
          return done(null, existingBySocial);
        }

        // 2) Otherwise, try to find an existing account by email and link it
        const email =
          (profile as any)._json?.email || profile.emails?.[0]?.value;
        if (email) {
          const existingByEmail = await User.findOne({ email });
          if (existingByEmail) {
            existingByEmail.socialId = profile.id;
            // Preserve existing signupType if it was already social; otherwise set to google
            if (
              !existingByEmail.signupType ||
              existingByEmail.signupType === "normal"
            ) {
              existingByEmail.signupType = profile.provider as any;
            }
            const photo =
              (profile.photos && profile.photos[0]?.value) || undefined;
            if (!existingByEmail.username && profile.displayName)
              existingByEmail.username = profile.displayName;
            if (!existingByEmail.image && photo) existingByEmail.image = photo;
            await existingByEmail.save();
            return done(null, existingByEmail);
          }
        }

        // 3) Create a brand new user if no match by socialId or email
        const newUser = new User({
          socialId: profile.id,
          signupType: profile.provider,
          email: email,
          username: profile.displayName,
          image: (profile.photos && profile.photos[0]?.value) || "profile.png",
        });
        await newUser.save();
        return done(null, newUser);
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
        // 1) If user already connected Facebook before
        const existingBySocial = await User.findOne({ socialId: profile.id });
        if (existingBySocial) {
          const photo = (profile.photos && profile.photos[0]?.value) || undefined;
          let updated = false;
          if (!existingBySocial.username && profile.displayName) {
            existingBySocial.username = profile.displayName;
            updated = true;
          }
          if (!existingBySocial.image && photo) {
            existingBySocial.image = photo;
            updated = true;
          }
          if (updated) await existingBySocial.save();
          return done(null, existingBySocial);
        }

        // 2) Link existing account by email if found
        const email = (profile as any)._json?.email || profile.emails?.[0]?.value;
        if (email) {
          const existingByEmail = await User.findOne({ email });
          if (existingByEmail) {
            existingByEmail.socialId = profile.id;
            if (!existingByEmail.signupType || existingByEmail.signupType === "normal") {
              existingByEmail.signupType = profile.provider as any;
            }
            const photo = (profile.photos && profile.photos[0]?.value) || undefined;
            if (!existingByEmail.username && profile.displayName) existingByEmail.username = profile.displayName;
            if (!existingByEmail.image && photo) existingByEmail.image = photo;
            await existingByEmail.save();
            return done(null, existingByEmail);
          }
        }

        // 3) Create new account
        const newUser = new User({
          socialId: profile.id,
          signupType: profile.provider,
          email: email,
          username: profile.displayName,
          image: (profile.photos && profile.photos[0]?.value) || "profile.png",
        });
        await newUser.save();
        return done(null, newUser);
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
