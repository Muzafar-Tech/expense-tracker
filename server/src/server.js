// server/src/server.js
import dotenv from "dotenv";
dotenv.config();

import express  from "express";
import cors     from "cors";
import session  from "express-session";
import passport from "passport";

import connectDB from "./config/db.js";
import adminRoutes        from "./routes/adminRoutes.js";
import authRoutes         from "./routes/authRoutes.js";
import googleAuthRoutes   from "./routes/googleAuth.js";
import groupRoutes        from "./routes/groupRoutes.js";
import expenseRoutes      from "./routes/expenseRoutes.js";
import balanceRoutes      from "./routes/balanceRoutes.js";
import activityRoutes     from "./routes/activityRoutes.js";
import dashboardRoutes    from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import "./config/passport.js";

const app = express();

// Connect MongoDB
connectDB();

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Session middleware (required for passport)
app.use(
  session({
    secret:            process.env.JWT_SECRET || "sessionsecret",
    resave:            false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* ── Routes ─────────────────────────────────────────────────── */
app.use("/api/auth",          authRoutes);
app.use("/api/auth",          googleAuthRoutes);
app.use("/api/groups",        groupRoutes);
app.use("/api/expenses",      expenseRoutes);
app.use("/api/balances",      balanceRoutes);
app.use("/api/activity",      activityRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin",         adminRoutes);

// Health check
app.get("/", (req, res) => res.send("API Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));