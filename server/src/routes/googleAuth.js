import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* -------- GOOGLE LOGIN -------- */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

/* -------- GOOGLE CALLBACK -------- */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:3000/auth",
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // -------- CREATE JWT TOKEN --------
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // -------- SAVE TOKEN IN DATABASE --------
      await User.findByIdAndUpdate(user._id, { token });

      // -------- REDIRECT TO DASHBOARD WITH TOKEN --------
      // Token is passed in URL so the frontend can store it in localStorage
      res.redirect(`http://localhost:3000/auth?token=${token}`);
    } catch (error) {
      console.error("Google auth callback error:", error);
      res.redirect("http://localhost:3000/auth");
    }
  }
);

export default router;