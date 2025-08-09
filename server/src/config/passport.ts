import passport, { type DoneCallback } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.ts";
import dotenv from "dotenv";
import { getUserHandle } from "../utils/helper.function.ts";

dotenv.config();

export interface UserProfile {
  sub: string,
  name: string,
  given_name: string,
  family_name: string,
  picture: string,
  email: string,
  email_verified: boolean
}

passport.serializeUser((user: Express.User, done: DoneCallback) => {
  done(null, user);
});
passport.deserializeUser(async (user: Express.User, done: DoneCallback) => {
  const currentUser = await User.findById(user);
  return done(null, currentUser);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      const userProfile: UserProfile = profile._json as UserProfile;
      const existingUser = await User.findOne({ googleId: userProfile.sub });
      if (existingUser) return done(null, existingUser);

      const user = new User({
        googleId: userProfile.sub,
        name: userProfile.name,
        email: userProfile.email,
        handle: getUserHandle(userProfile)
      });
      await user.save();
      done(null, user);
    }
  )
);
