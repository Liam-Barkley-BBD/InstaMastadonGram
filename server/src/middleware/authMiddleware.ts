import type { NextFunction, Request, Response } from "express";
import type { SessionData } from "express-session";

declare module 'express-session' {
    interface SessionData {
        passport: { user: string };
    }
}

export const isAuthenticated = async(req: Request, res: Response, next: NextFunction) => {
  const requestSession = req.session as SessionData;
  const pass: { user: string } = requestSession.passport;
  if(!pass) {
    return res.status(403).json({ error: "Forbidden"});
  }
  next();
}