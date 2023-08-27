import HttpException from "../libs/http-exception";

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
