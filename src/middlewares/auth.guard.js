import HttpException from "../libs/http-exception.js";

export const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  throw new HttpException("로그인이 필요합니다.", 401);
};

export const isNotLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    throw new HttpException("이미 로그인 되어 있습니다.", 400);
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  throw new HttpException("권한이 없습니다.", 403);
};
