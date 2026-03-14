// server/src/controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {

    const { name, email, password } = req.body;

    // -------- VALIDATIONS --------

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must be at least 2 characters long"
      });
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    if (!gmailRegex.test(email)) {
      return res.status(400).json({
        message: "Email must be a valid Gmail address (example@gmail.com)"
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
    }

    // -------- CHECK USER EXISTS --------

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // -------- HASH PASSWORD --------

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // -------- CREATE USER --------

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    if (!gmailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid Gmail address"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    // -------- Generate JWT --------

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ REMOVED: user.token = token / await user.save()
    // Token is stateless — no need to store it in DB
    // This allows login from multiple devices simultaneously

    res.json({
      message: "Login successful",
      token,
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// -------- GET CURRENT USER --------
// GET /api/auth/me
// Called by AuthContext on every page load to restore session

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -token");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};