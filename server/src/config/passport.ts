import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { generateCryptoKeyPair, exportJwk } from "@fedify/fedify";
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
      
      const baseHandle = profile.emails?.[0]?.value?.split('@')[0] || `user${user._id}`;
      const sanitizedHandle = baseHandle
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase() + '_' + profile.id.slice(-7);

      const rsaPair = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
      const ed25519Pair = await generateCryptoKeyPair("Ed25519");

      const rsaPublic = await exportJwk(rsaPair.publicKey);
      const rsaPrivate = await exportJwk(rsaPair.privateKey);
      const edPublic = await exportJwk(ed25519Pair.publicKey);
      const edPrivate = await exportJwk(ed25519Pair.privateKey);

      const actor = new Actor({
        uri: `${process.env.DOMAIN}/users/${sanitizedHandle}`,
        inboxUri: `${process.env.DOMAIN}/users/${sanitizedHandle}/inbox`,
        sharedInboxUri: `${process.env.DOMAIN}/inbox`,
        handle: sanitizedHandle,
        keys: {
          rsa: {
            publicKey: rsaPublic,
            privateKey: rsaPrivate,
          },
          ed25519: {
            publicKey: edPublic,
            privateKey: edPrivate,
          },
        },
      });
      
      await actor.save();
      await user.save();
      
      done(null, user);
    }
  )
);
