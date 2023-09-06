import {
  auth,
  login,
  logout,
  register,
  verifyEmail,
} from "../../../src/controllers/auth.controller";
import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import passport from "passport";
import HttpException from "../../../src/libs/http-exception";
import {
  sendVerificationEmail,
  checkEmailVerified,
  sendEmail,
} from "../../../src/libs/email-service";
import bcrypt from "bcrypt";
import { z } from "zod";

jest.mock("../../../src/configs/prisma-client", () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../../src/libs/email-service", () => ({
  sendVerificationEmail: jest.fn(),
  checkEmailVerified: jest.fn(),
  sendEmail: jest.fn(),
}));

jest.mock("bcrypt");

jest.mock("passport");

let req, res, next;

beforeEach(() => {
  req = httpMocks.createRequest();
  res = httpMocks.createResponse();
  next = jest.fn();
});

describe("Auth Controller", () => {
  describe("auth", () => {
    it("should return your user data when it is logged in", async () => {
      req.user = {
        id: "userId",
      };
      req.session = {
        selectedItems: [],
      };

      await auth(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "유저 인증 성공",
        data: { ...req.user, selectedItems: req.session.selectedItems },
      });
    });

    it("should return your user data when it is not logged in", async () => {
      await auth(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: false,
        msg: "유저 인증 실패",
      });
    });
  });

  describe("login", () => {
    beforeEach(() => {
      req.logIn = jest
        .fn()
        .mockImplementation((user, callback) => callback(null));
    });

    it("should login successfully", async () => {
      const user = {};
      const info = "로그인 성공";

      passport.authenticate = jest.fn((strategy, callback) => () => {
        callback(null, user, info);
      });

      login(req, res, next);

      expect(passport.authenticate).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "로그인 성공",
      });
    });

    it("should throw 500 error when there is an err in authenticate process", async () => {
      passport.authenticate = jest.fn((strategy, callback) => () => {
        callback(true, null, null);
      });

      try {
        login(req, res, next);
      } catch (error) {
        expect(passport.authenticate).toHaveBeenCalled();
        expect(error.status).toBe(500);
        expect(error.message).toBe("로그인 인증 중 에러 발생");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw 500 error when there is an err in login process", async () => {
      const user = {};
      passport.authenticate = jest.fn((strategy, callback) => () => {
        callback(null, user, null);
      });
      req.logIn.mockImplementation((user, callback) => callback(true));

      try {
        login(req, res, next);
      } catch (error) {
        expect(passport.authenticate).toHaveBeenCalled();
        expect(error.status).toBe(500);
        expect(error.message).toBe("로그인 중 에러 발생");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw error when there is no exUser", async () => {
      const email = "test@test.com";
      const info = `Email ${email} not found`;
      passport.authenticate = jest.fn((strategy, callback) => () => {
        callback(null, false, info);
      });

      try {
        login(req, res, next);
      } catch (error) {
        expect(error.status).toBe(401);
        expect(error.message).toBe(info);
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw error when email or password is not correct", async () => {
      const info = "Invalid email or password.";
      passport.authenticate = jest.fn((strategy, callback) => () => {
        callback(null, false, info);
      });

      try {
        login(req, res, next);
      } catch (error) {
        expect(error.status).toBe(401);
        expect(error.message).toBe(info);
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("logout", () => {
    it("should logout successfully", () => {
      req.logOut = jest.fn().mockImplementation((callback) => callback(null));

      logout(req, res);

      expect(res.statusCode).toBe(204);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "로그아웃 성공",
      });
    });

    it("should throw error when there is something wrong", () => {
      req.logOut = jest.fn().mockImplementation((callback) => callback(true));

      try {
        logout(req, res, next);
      } catch (error) {
        expect(error.status).toBe(500);
        expect(error.message).toBe("로그아웃 중 에러 발생");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("register", () => {
    beforeEach(() => {
      bcrypt.genSalt = jest.fn().mockResolvedValue(12);
      bcrypt.hash = jest.fn().mockResolvedValue("hashedPassword");
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should create new User successfully when there is no exUser", async () => {
      const user = {};
      req.body = {
        email: "test@test.com",
        password: "000000",
        username: "tester",
      };
      req.logIn = jest.fn((user, callback) => callback(null));

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);

      await register(req, res, next);

      expect(prisma.user.create).toBeCalledTimes(1);
      expect(prisma.user.create).toBeCalledWith({
        data: {
          email: req.body.email,
          password: "hashedPassword",
          username: req.body.username,
          isAdmin: req.body.email === process.env.ADMIN_EMAIL,
        },
        select: {
          id: true,
        },
      });

      expect(sendVerificationEmail).toBeCalledTimes(1);
      expect(sendVerificationEmail).toBeCalledWith(req.body.email);
      expect(bcrypt.hash).toBeCalledTimes(1);
      expect(req.logIn).toBeCalledTimes(1);
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should update password when there is exUser with Social Login(without password)", async () => {
      const user = {};
      req.body = {
        email: "test@test.com",
        password: "000000",
        username: "tester",
      };
      req.logIn = jest.fn((user, callback) => callback(null));

      prisma.user.findUnique.mockResolvedValue(user);

      await register(req, res, next);

      expect(prisma.user.update).toBeCalledTimes(1);
      expect(prisma.user.update).toBeCalledWith({
        where: {
          email: req.body.email,
        },
        data: {
          password: "hashedPassword",
        },
      });
      expect(sendVerificationEmail).toBeCalledTimes(1);
      expect(sendVerificationEmail).toBeCalledWith(req.body.email);
      expect(bcrypt.hash).toBeCalledTimes(1);
      expect(req.logIn).toBeCalledTimes(1);
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 409 error when there is exUser with password", async () => {
      const user = {
        password: "exUserPassword",
      };
      req.body = {
        email: "test@test.com",
        password: "000000",
        username: "tester",
      };

      prisma.user.findUnique.mockResolvedValue(user);

      try {
        await register(req, res, next);
      } catch (error) {
        expect(prisma.user.update).toBeCalledTimes(0);
        expect(prisma.user.create).toBeCalledTimes(0);
        expect(sendVerificationEmail).toBeCalledTimes(0);
        expect(error.status).toBe(409);
        expect(error.message).toBe("이미 존재하는 유저입니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw error when receive invalid input", async () => {
      req.body = {
        email: "test@test.com",
        password: "000000",
      };

      try {
        await register(req, res, next);
      } catch (error) {
        expect(prisma.user.update).toBeCalledTimes(0);
        expect(prisma.user.create).toBeCalledTimes(0);
        expect(sendVerificationEmail).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    it("should throw 500 error when there is somethig wrong with login process", async () => {
      const user = {};
      req.body = {
        email: "test@test.com",
        password: "000000",
        username: "tester",
      };
      req.logIn = jest
        .fn()
        .mockImplementation((user, callback) => callback(true));

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);

      try {
        await register(req, res, next);
      } catch (error) {
        expect(prisma.user.create).toBeCalledTimes(1);
        expect(prisma.user.create).toBeCalledWith({
          data: {
            email: req.body.email,
            password: "hashedPassword",
            username: req.body.username,
            isAdmin: req.body.email === process.env.ADMIN_EMAIL,
          },
          select: {
            id: true,
          },
        });
        expect(sendVerificationEmail).toBeCalledTimes(1);
        expect(sendVerificationEmail).toBeCalledWith(req.body.email);
        expect(bcrypt.hash).toBeCalledTimes(1);
        expect(req.logIn).toBeCalledTimes(1);
        expect(error.status).toBe(500);
        expect(error.message).toBe("로그인 중 에러 발생");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("verifyEmail", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("should verfiy email successfully", async () => {
      const exUser = {
        isVerified: false,
      };

      req.user = {
        id: "userId",
        email: "test@test.com",
      };

      checkEmailVerified.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(exUser);

      await verifyEmail(req, res, next);

      expect(checkEmailVerified).toBeCalledTimes(1);
      expect(checkEmailVerified).toBeCalledWith(req.user.email);
      expect(prisma.user.findUnique).toBeCalledTimes(1);
      expect(prisma.user.update).toBeCalledTimes(1);
      expect(prisma.user.update).toBeCalledWith({
        where: {
          id: req.user.id,
        },
        data: {
          isVerified: true,
        },
      });
      expect(sendEmail).toBeCalledTimes(1);
      expect(sendEmail).toBeCalledWith("JOIN", req.user.email);
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 403 error when it is not verified email on AWS", async () => {
      req.user = {
        email: "test@test.com",
      };

      checkEmailVerified.mockResolvedValue(false);

      try {
        await verifyEmail(req, res, next);
      } catch (error) {
        expect(checkEmailVerified).toBeCalledTimes(1);
        expect(checkEmailVerified).toBeCalledWith(req.user.email);
        expect(prisma.user.findUnique).toBeCalledTimes(0);
        expect(prisma.user.update).toBeCalledTimes(0);
        expect(sendEmail).toBeCalledTimes(0);
        expect(error.status).toBe(403);
        expect(error.message).toBe("이메일 인증을 수행해주세요.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw 400 error when it is already verified", async () => {
      const exUser = {
        isVerified: true,
      };

      req.user = {
        id: "userId",
        email: "test@test.com",
      };

      checkEmailVerified.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(exUser);

      try {
        await verifyEmail(req, res, next);
      } catch (error) {
        expect(checkEmailVerified).toBeCalledTimes(1);
        expect(checkEmailVerified).toBeCalledWith(req.user.email);
        expect(prisma.user.findUnique).toBeCalledTimes(1);
        expect(prisma.user.update).toBeCalledTimes(0);
        expect(sendEmail).toBeCalledTimes(0);
        expect(error.status).toBe(400);
        expect(error.message).toBe("이미 인증된 이메일입니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });
});
