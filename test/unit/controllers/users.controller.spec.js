import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import {
  deleteUserById,
  getAllUsers,
  getUserDetail,
  updateUserById,
} from "../../../src/controllers/users.controller";
import CONFIGS from "../../../src/configs/contant";
import HttpException from "../../../src/libs/http-exception";
import { z } from "zod";
import bcrypt from "bcrypt";

jest.mock("../../../src/configs/prisma-client", () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("bcrypt");

let req, res, next;

beforeEach(() => {
  req = httpMocks.createRequest();
  res = httpMocks.createResponse();
  next = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Users Controller", () => {
  describe("getAllUsers", () => {
    it("should return user data as many times as PAGESIZE", async () => {
      const users = [{}, {}, {}];
      req.query = {
        page: "1",
      };
      prisma.user.findMany.mockResolvedValue(users);

      await getAllUsers(req, res);

      expect(prisma.user.findMany).toBeCalledTimes(1);
      expect(prisma.user.findMany).toBeCalledWith({
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
        skip: (req.query.page - 1) * CONFIGS.PAGESIZE,
        orderBy: [{ username: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 유저 조회 완료.",
        data: users,
      });
    });

    it("should set default page to 1", async () => {
      const users = [{}, {}, {}];
      prisma.user.findMany.mockResolvedValue(users);

      await getAllUsers(req, res);

      expect(prisma.user.findMany).toBeCalledTimes(1);
      expect(prisma.user.findMany).toBeCalledWith({
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
        skip: 0,
        orderBy: [{ username: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 유저 조회 완료.",
        data: users,
      });
    });

    it("should throw 404 error when there is no users", async () => {
      prisma.user.findMany.mockResolvedValue([]);

      try {
        await getAllUsers(req, res);
      } catch (error) {
        expect(prisma.user.findMany).toBeCalledTimes(1);
        expect(prisma.user.findMany).toBeCalledWith({
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
          skip: 0,
          orderBy: [{ username: "asc" }],
        });
        expect(error.status).toBe(404);
        expect(error.message).toBe("유저 정보가 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw zod error when receive invalid query", async () => {
      req.query = {
        page: 1,
      };

      try {
        await getAllUsers(req, res);
      } catch (error) {
        expect(prisma.user.findMany).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("getUserDetail", () => {
    it("should return user's detail data", async () => {
      const user = {};
      req.params = {
        userId: "userId",
      };
      prisma.user.findUnique.mockResolvedValue(user);

      await getUserDetail(req, res);

      expect(prisma.user.findUnique).toBeCalledTimes(1);
      expect(prisma.user.findUnique).toBeCalledWith({
        where: {
          id: req.params.userId,
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
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "유저 정보 조회 성공.",
        data: user,
      });
    });

    it("should throw 404 error when there is no user", async () => {
      req.params = {
        userId: "userId",
      };
      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await getUserDetail(req, res);
      } catch (error) {
        expect(prisma.user.findUnique).toBeCalledTimes(1);
        expect(prisma.user.findUnique).toBeCalledWith({
          where: {
            id: req.params.userId,
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
        expect(error.status).toBe(404);
        expect(error.message).toBe("유저 정보가 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("deleteUserById", () => {
    it("should delete user successfully", async () => {
      req.params = {
        userId: "userId",
      };
      await deleteUserById(req, res);

      expect(prisma.user.delete).toBeCalledTimes(1);
      expect(prisma.user.delete).toBeCalledWith({
        where: {
          id: req.params.userId,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });
  });

  describe("updateUser", () => {
    beforeEach(() => {
      bcrypt.genSalt = jest.fn().mockResolvedValue(12);
      bcrypt.hash = jest.fn().mockResolvedValue("hashedNewPassword");
    });

    it("should update user data successfully", async () => {
      const exUser = {};
      req.params = {
        userId: "userId",
      };
      req.body = {
        password: "password",
        newPassword: "newPassword",
        username: "newUsername",
      };

      prisma.user.findUnique.mockResolvedValue(exUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await updateUserById(req, res);

      expect(prisma.user.findUnique).toBeCalledTimes(1);
      expect(prisma.user.findUnique).toBeCalledWith({
        where: {
          id: req.params.userId,
        },
        select: {
          password: true,
        },
      });
      expect(bcrypt.compare).toBeCalledTimes(1);
      expect(bcrypt.genSalt).toBeCalledTimes(1);
      expect(bcrypt.hash).toBeCalledTimes(1);
      expect(prisma.user.update).toBeCalledWith({
        where: {
          id: req.params.userId,
        },
        data: {
          username: req.body.username,
          password: "hashedNewPassword",
        },
      });
    });

    it("should throw error when receive invalid data", async () => {
      req.params = {
        userId: "userId",
      };
      req.body = {};

      try {
        await updateUserById(req, res);
      } catch (error) {
        expect(prisma.user.findUnique).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    it("should throw 404 error when there is no exUser", async () => {
      req.params = {
        userId: "userId",
      };
      req.body = {
        password: "password",
        newPassword: "newPassword",
        username: "newUsername",
      };

      prisma.user.findUnique.mockResolvedValue(null);

      try {
        await updateUserById(req, res);
      } catch (error) {
        expect(prisma.user.findUnique).toBeCalledTimes(1);
        expect(prisma.user.findUnique).toBeCalledWith({
          where: {
            id: req.params.userId,
          },
          select: {
            password: true,
          },
        });

        expect(error.status).toBe(404);
        expect(error.message).toBe("유저 정보가 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw 403 error when receive incorrect password", async () => {
      const exUser = {};
      req.params = {
        userId: "userId",
      };
      req.body = {
        password: "password",
        newPassword: "newPassword",
        username: "newUsername",
      };

      prisma.user.findUnique.mockResolvedValue(exUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      try {
        await updateUserById(req, res);
      } catch (error) {
        expect(prisma.user.findUnique).toBeCalledTimes(1);
        expect(prisma.user.findUnique).toBeCalledWith({
          where: {
            id: req.params.userId,
          },
          select: {
            password: true,
          },
        });
        expect(bcrypt.compare).toBeCalledTimes(1);
        expect(bcrypt.genSalt).toBeCalledTimes(0);
        expect(bcrypt.hash).toBeCalledTimes(0);
        expect(error.status).toBe(403);
        expect(error.message).toBe("비밀번호가 일치하지 않습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should update only username when there is no newPassword", async () => {
      const exUser = {};
      req.params = {
        userId: "userId",
      };
      req.body = {
        password: "password",
        username: "newUsername",
      };

      prisma.user.findUnique.mockResolvedValue(exUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      await updateUserById(req, res);
      expect(prisma.user.findUnique).toBeCalledTimes(1);
      expect(prisma.user.findUnique).toBeCalledWith({
        where: {
          id: req.params.userId,
        },
        select: {
          password: true,
        },
      });
      expect(bcrypt.compare).toBeCalledTimes(1);
      expect(bcrypt.genSalt).toBeCalledTimes(0);
      expect(bcrypt.hash).toBeCalledTimes(0);
      expect(prisma.user.update).toBeCalledWith({
        where: {
          id: req.params.userId,
        },
        data: {
          username: req.body.username,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });
  });
});
