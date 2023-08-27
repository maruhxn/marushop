import express from "express";
import passport from "passport";
import { login, logout, register } from "../controllers/auth.controller.js";
import catchAsync from "../libs/catch-async.js";

const authRouter = express.Router();

authRouter.post("/login", catchAsync(login));

authRouter.post("/logout", catchAsync(logout));

authRouter.post("/register", catchAsync(register));

authRouter.get("/google", passport.authenticate("google"));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

authRouter.get("/kakao", passport.authenticate("kakao"));

authRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

export default authRouter;
