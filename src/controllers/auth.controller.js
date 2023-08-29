import bcrypt from "bcrypt";
import passport from "passport";

import { prisma } from "../app.js";
import CONFIGS from "../configs/contant.js";
import {
  isEmailVerified,
  sendEmail,
  sendVerificationEmail,
} from "../libs/email-service.js";
import HttpException from "../libs/http-exception.js";
import { CreateUserValidator } from "../libs/validators/user.validator.js";

export const login = async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) throw new HttpException({ msg: info }, 401);

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({
        ok: true,
        msg: "로그인 성공",
      });
    });
  })(req, res, next);
};

export const logout = (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    return res.status(200).json({
      ok: true,
      msg: "로그아웃 성공",
    });
  });
};

export const register = async (req, res, next) => {
  const { email, password, username } = CreateUserValidator.parse(req.body);
  const salt = await bcrypt.genSalt(CONFIGS.SALT_ROUNDS);
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, salt),
      username,
      isAdmin: email === process.env.ADMIN_EMAIL,
    },
  });

  await sendVerificationEmail(email);
  res.status(201).end();
};

export const verifyEmail = async (req, res, next) => {
  const isVerified = await isEmailVerified(req.user.email);
  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      isVerified,
    },
  });

  await sendEmail("JOIN", req.user.email);
  res.status(204).end();
};
