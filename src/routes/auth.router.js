import express from "express";
import passport from "passport";
import { login, logout, register } from "../controllers/auth.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isLoggedIn, isNotLoggedIn } from "../middlewares/auth.guard.js";

const authRouter = express.Router();

authRouter.post("/login", isNotLoggedIn, catchAsync(login));

authRouter.post("/logout", isLoggedIn, catchAsync(logout));

authRouter.post("/register", isNotLoggedIn, catchAsync(register));

authRouter.get("/google", isNotLoggedIn, passport.authenticate("google"));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

authRouter.get("/kakao", isNotLoggedIn, passport.authenticate("kakao"));

authRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

export default authRouter;
