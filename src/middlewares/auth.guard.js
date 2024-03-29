import prisma from "../configs/prisma-client.js";
import { checkEmailVerified } from "../libs/email-service.js";
import HttpException from "../libs/http-exception.js";

export const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  next(new HttpException("로그인이 필요합니다.", 401));
};

export const isNotLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(new HttpException("이미 로그인 되어 있습니다.", 400));
  }
  next();
};

export const isEmailVerified = async (req, res, next) => {
  try {
    if (await checkEmailVerified(req.user.email)) {
      return next();
    }
  } catch (err) {
    return next(err);
  }
  next(new HttpException("이메일 인증이 필요합니다.", 403));
};

export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  next(new HttpException("권한이 없습니다.", 403));
};

export const checkUserByOrderIdOrAdmin = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        userId: true,
      },
    });

    if (!order)
      return next(new HttpException("요청하신 주문 정보가 없습니다.", 404));

    if (order.userId !== req.user.id && !req.user.isAdmin)
      return next(new HttpException("권한이 없습니다.", 403));
    next();
  } catch (err) {
    next(err);
  }
};

export const checkUserByUserId = async (req, res, next) => {
  const { userId } = req.params;
  if (req.user.id === userId) {
    return next();
  }
  next(new HttpException("권한이 없습니다.", 403));
};
