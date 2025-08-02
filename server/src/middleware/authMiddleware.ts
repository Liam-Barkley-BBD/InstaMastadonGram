import type { NextFunction, Request, Response } from "express";
import type { SessionData } from "express-session";
import userModel from "../models/user.model.ts";
import Actor from "../models/actor.model.ts";
import { type ActorDoc } from "../models/actor.model.ts";

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
    const user: ActorDoc = await Actor.findOne({ userId: currentUser?._id }) as ActorDoc;

    req.user = user;
    next();
  } catch(error) {
    next();
  }
}