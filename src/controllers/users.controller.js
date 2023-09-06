import bcrypt from "bcrypt";
import CONFIGS from "../configs/contant.js";
import prisma from "../configs/prisma-client.js";
import HttpException from "../libs/http-exception.js";
import { UpdateUserValidator } from "../libs/validators/user.validator.js";
import { UsersQueryValidator } from "../libs/validators/users-query.validator.js";

export const getAllUsers = async (req, res) => {
  const { page = 1 } = UsersQueryValidator.parse(req.query);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      googleId: true,
      kakaoId: true,
      isVerified: true,
      _count: true,
    },
    take: CONFIGS.PAGESIZE,
    skip: (page - 1) * CONFIGS.PAGESIZE,
    orderBy: [{ username: "asc" }],
  });

  if (users.length <= 0) throw new HttpException("유저 정보가 없습니다.", 404);
  return res.status(200).json({
    ok: true,
    msg: "전체 유저 조회 완료.",
    data: users,
  });
};

export const getUserDetail = async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      googleId: true,
      kakaoId: true,
      isVerified: true,
      cartItems: true,
      orders: true,
    },
  });
  if (!user) throw new HttpException("유저 정보가 없습니다.", 404);

  return res.status(200).json({
    ok: true,
    msg: "유저 정보 조회 성공.",
    data: user,
  });
};

export const deleteUserById = async (req, res) => {
  const { userId } = req.params;

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return res.status(204).end();
};

export const updateUserById = async (req, res) => {
  const { userId } = req.params;
  const updateUserDto = UpdateUserValidator.parse(req.body);

  let salt;
  let hashedNewPassword;

  const { username, password, newPassword } = updateUserDto;

  const exUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      password: true,
    },
  });

  if (!exUser) throw new HttpException("유저 정보가 없습니다.", 404);

  if (!bcrypt.compare(password, exUser.password))
    throw new HttpException("비밀번호가 일치하지 않습니다.", 403);

  if (newPassword) {
    salt = await bcrypt.genSalt(CONFIGS.SALT_ROUNDS);
    hashedNewPassword = await bcrypt.hash(newPassword, salt);
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      username,
      password: hashedNewPassword,
    },
  });

  return res.status(204).end();
};
