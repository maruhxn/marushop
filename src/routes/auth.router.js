import express from "express";
import passport from "passport";
import {
  auth,
  login,
  logout,
  register,
  verifyEmail,
} from "../controllers/auth.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isLoggedIn, isNotLoggedIn } from "../middlewares/auth.guard.js";

const authRouter = express.Router();

authRouter.get("/", catchAsync(auth));

authRouter.post("/login", isNotLoggedIn, catchAsync(login));

authRouter.delete("/logout", isLoggedIn, catchAsync(logout));

authRouter.post("/register", isNotLoggedIn, catchAsync(register));

authRouter.get("/verify-email", isLoggedIn, catchAsync(verifyEmail));

authRouter.get("/google", isNotLoggedIn, passport.authenticate("google"));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect: `${process.env.CLIENT_URL}`,
    failureRedirect: "/login",
  })
);

authRouter.get("/kakao", isNotLoggedIn, passport.authenticate("kakao"));

authRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect: `${process.env.CLIENT_URL}`,
    failureRedirect: "/login",
  })
);

export default authRouter;
