import bcrypt from "bcrypt";
import passport from "passport";
import CONFIGS from "../configs/contant.js";
import prisma from "../configs/prisma-client.js";
import {
  checkEmailVerified,
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
    data: { ...req.user, selectedItems: req.session.selectedItems },
  });
};

export const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw new HttpException("로그인 인증 중 에러 발생", 500);

    if (!user) throw new HttpException(info, 401);

    req.logIn(user, (err) => {
      if (err) throw new HttpException("로그인 중 에러 발생", 500);
      return res.status(200).json({
        ok: true,
        msg: "로그인 성공",
      });
    });
  })(req, res, next);
};

export const logout = (req, res, next) => {
  req.logOut((err) => {
    if (err) throw new HttpException("로그아웃 중 에러 발생", 500);
    return res.status(204).json({
      ok: true,
      msg: "로그아웃 성공",
    });
  });
};

export const register = async (req, res, next) => {
  const { email, password, username } = CreateUserValidator.parse(req.body);
  const salt = await bcrypt.genSalt(CONFIGS.SALT_ROUNDS);
  let user;

  user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user && user.password)
    throw new HttpException("이미 존재하는 유저입니다.", 409);

  if (user && !user.password) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        password: await bcrypt.hash(password, salt),
      },
    });
  } else {
    user = await prisma.user.create({
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
  }

  await sendVerificationEmail(email);

  req.logIn(user, (err) => {
    if (err) throw new HttpException("로그인 중 에러 발생", 500);

    res.status(201).end();
  });
};

export const verifyEmail = async (req, res, next) => {
  const isVerified = await checkEmailVerified(req.user.email);

  if (!isVerified) throw new HttpException("이메일 인증을 수행해주세요.", 403);

  const exUser = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
  });

  if (exUser.isVerified)
    throw new HttpException("이미 인증된 이메일입니다.", 400);

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
