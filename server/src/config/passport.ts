import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.ts";
import Actor from "../models/actor.model.ts";
import dotenv from "dotenv";

dotenv.config();

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) return done(null, existingUser);

      const user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
      });
      await user.save();

      const baseHandle =
        profile.emails?.[0]?.value?.split("@")[0] || `user${user._id}`;
      const sanitizedHandle =
        baseHandle.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() +
        "_" +
        profile.id.slice(-7);

      const actor = new Actor({
        userId: user._id,
        uri: `${process.env.DOMAIN}/users/${sanitizedHandle}`,
        handle: sanitizedHandle,
        name: profile.displayName,
        inboxUrl: `${process.env.DOMAIN}/users/${sanitizedHandle}/inbox`,
        sharedInboxUrl: `${process.env.DOMAIN}/inbox`,
        url: `${process.env.DOMAIN}/@${sanitizedHandle}`,
        summary: null,
      });
      await actor.save();

      done(null, user);
    },
  ),
);
