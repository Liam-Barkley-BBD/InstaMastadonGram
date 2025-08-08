import type { NextFunction, Request, Response } from "express";
import type { SessionData } from "express-session";
import userModel from "../models/user.model.ts";
import Actor from "../models/actor.model.ts";
import { type ActorDoc } from "../models/actor.model.ts";
import { generateCryptoKeyPair, exportJwk } from "@fedify/fedify";

declare module 'express-session' {
    interface SessionData {
        passport: { user: string };
    }
}

export const isAuthenticated = async(req: Request, res: Response, next: NextFunction) => {
  try {  
    const requestSession = req.session as SessionData;
    const pass: { user: string } = requestSession.passport;
    
    if(req.isUnauthenticated()) {
      return res.status(403).json({ error: "Forbidden"});
    }

    const currentUser = await userModel.findOne({ _id: pass.user });
    const baseHandle = currentUser?.email?.split('@')[0] || `user${currentUser?._id}`;
      const sanitizedHandle = baseHandle
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase() + '_' + currentUser?.googleId.slice(-7);

      const rsaPair = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
      const ed25519Pair = await generateCryptoKeyPair("Ed25519");

      const rsaPublic = await exportJwk(rsaPair.publicKey);
      const rsaPrivate = await exportJwk(rsaPair.privateKey);
      const edPublic = await exportJwk(ed25519Pair.publicKey);
      const edPrivate = await exportJwk(ed25519Pair.privateKey);

      const actor = new Actor({
        userId: currentUser?._id,
        uri: `${process.env.DOMAIN}/api/users/${sanitizedHandle}`,
        inboxUri: `${process.env.DOMAIN}/api/users/${sanitizedHandle}/inbox`,
        sharedInboxUri: `${process.env.DOMAIN}/api/inbox`,
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
    req.user = {
      name: currentUser?.name,
      email: currentUser?.email,
      handle: sanitizedHandle,
      url: actor.uri
    }  
    await Actor.findOneAndUpdate({ handle: sanitizedHandle }, actor, { upsert: true });
    next();
  } catch(error) {
    next();
  }
}