import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // -------- GET TOKEN FROM HEADER --------
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }

    // -------- TOKEN MISSING --------
    if (!token) {
      return res.status(401).json({
        message: "Not authorized, token missing"
      });
    }

    // -------- VERIFY JWT --------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // -------- FIND USER --------
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    // ✅ REMOVED: token match check (user.token !== token)
    // That check blocked multi-device login by only allowing
    // one active token at a time. JWT is stateless — any valid
    // token signed with JWT_SECRET is accepted from any device.

    // attach user to request
    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Not authorized, token failed"
    });
  }
};

export default protect;