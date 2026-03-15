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
    failureRedirect: `${process.env.CLIENT_URL}/auth`,
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

      // -------- REDIRECT TO FRONTEND WITH TOKEN --------
      res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
    } catch (error) {
      console.error("Google auth callback error:", error);
      res.redirect(`${process.env.CLIENT_URL}/auth`);
    }
  }
);

export default router;