import express from "express";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.routes.ts";
import postRoutes from "./routes/post.routes.ts"
import federation from "./services/federation.ts";
import { integrateFederation } from "@fedify/express";
import "./config/passport";
import dotenv from "dotenv";
import MongoStore from "connect-mongo";
import userRoutes from "./routes/users.routes.ts"

import frontendRouter from "./routes/frontend.routes.ts";
import searchRouter from "./routes/search.routes.ts"
import cors from "cors"

dotenv.config();

const app = express();

const allowedOrigins = ['http://localhost:5173', 'https://bbd-grad-program-2025.online'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.set("trust proxy", true);

app.use((req, res, next) => {
  if (req.method === 'POST' && /^\/api\/posts\/[^/]+$/.test(req.path)) {
    return next();
  }
  integrateFederation(federation, (req) => req.user)(req, res, next);
});

app.use("/api/posts", postRoutes);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || "mongodb://localhost:27017/",
    touchAfter: 24 * 3600,
    ttl: 14 * 24 * 60 * 60
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes)
app.use("/api/frontend", frontendRouter);
app.use("/api/search", searchRouter);

app.get("/", (req, res) => {
  res.send("Hello, Fedify + Google Auth!");
});

export default app;