import express from "express";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.routes.ts";
import federation from "./services/federation.ts";
import { integrateFederation } from "@fedify/express";
import "./config/passport";
import dotenv from "dotenv";
import MongoStore from "connect-mongo";

dotenv.config();

const app = express();

app.set("trust proxy", true);
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI!,
    touchAfter: 24 * 3600,
    ttl: 14 * 24 * 60 * 60
  })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);

app.use(integrateFederation(federation, (req) => undefined));

app.get("/", (req, res) => {
  res.send("Hello, Fedify + Google Auth!");
});

export default app;
