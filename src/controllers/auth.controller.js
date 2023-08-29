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

export const auth = async (req, res) => {
  if (!req.user)
    return res.status(200).json({
      ok: false,
      msg: "유저 인증 실패",
    });
  return res.status(200).json({
    ok: true,
    msg: "유저 인증 성공",
    data: req.user,
  });
};

export const login = async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) throw new HttpException(info, 401);

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

export const logout = (req, res) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    return res.status(204).json({
      ok: true,
      msg: "로그아웃 성공",
    });
  });
};

export const register = async (req, res) => {
  const { email, password, username } = CreateUserValidator.parse(req.body);
  const salt = await bcrypt.genSalt(CONFIGS.SALT_ROUNDS);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, salt),
      username,
      isAdmin: email === process.env.ADMIN_EMAIL,
    },
    select: {
      id: true,
    },
  });

  req.logIn(newUser, async (err) => {
    if (err) {
      return next(err);
    }

    await sendVerificationEmail(email);

    res.status(201).end();
  });
};

export const verifyEmail = async (req, res) => {
  const isVerified = await isEmailVerified(req.user.email);

  if (!isVerified) throw new HttpException("이메일 인증을 수행해주세요.", 403);
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
