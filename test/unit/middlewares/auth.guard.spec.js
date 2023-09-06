import httpMocks from "node-mocks-http";
import {
  checkUserByOrderIdOrAdmin,
  checkUserByUserId,
  isAdmin,
  isLoggedIn,
  isNotLoggedIn,
} from "../../../src/middlewares/auth.guard";
import prisma from "../../../src/configs/prisma-client";

jest.mock("../../../src/configs/prisma-client", () => ({
  order: {
    findUnique: jest.fn(),
  },
}));

let req, res, next;

describe("Auth Guard", () => {
  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  describe("isLoggedIn", () => {
    it("should call next when is logged in", () => {
      req.isAuthenticated = jest.fn(() => true);
      isLoggedIn(req, res, next);

      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should throw error when is not logged in", () => {
      req.isAuthenticated = jest.fn(() => false);
      isLoggedIn(req, res, next);
      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("로그인이 필요합니다."));
    });
  });

  describe("isNotLoggedIn", () => {
    it("should call next when is not logged in", () => {
      req.isAuthenticated = jest.fn(() => false);
      isNotLoggedIn(req, res, next);

      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should throw error when is logged in", () => {
      req.isAuthenticated = jest.fn(() => true);
      isNotLoggedIn(req, res, next);
      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("이미 로그인 되어 있습니다."));
    });
  });

  describe("isAdmin", () => {
    it("should call next when is logged in and is admin", () => {
      req.isAuthenticated = jest.fn(() => true);
      req.user = {
        isAdmin: true,
      };
      isAdmin(req, res, next);

      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should throw error when is not logged in", () => {
      req.isAuthenticated = jest.fn(() => false);
      isAdmin(req, res, next);
      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("권한이 없습니다."));
    });

    it("should throw error when is logged in, but is not admin", () => {
      req.isAuthenticated = jest.fn(() => true);
      req.user = {
        isAdmin: false,
      };
      isAdmin(req, res, next);
      expect(req.isAuthenticated).toBeCalledTimes(1);
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("권한이 없습니다."));
    });
  });

  describe("checkUserByOrderIdOrAdmin", () => {
    const orderId = "orderId";
    const userId = "userId";

    beforeEach(() => {
      req.params = {
        orderId,
      };
    });

    it("should call next when match order's userId and req.user.id", async () => {
      req.user = {
        id: userId,
        isAdmin: false,
      };

      prisma.order.findUnique.mockResolvedValue({ userId });

      await checkUserByOrderIdOrAdmin(req, res, next);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: { userId: true },
      });
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should call next when is admin", async () => {
      req.user = {
        id: "not match",
        isAdmin: true,
      };

      prisma.order.findUnique.mockResolvedValue({ userId });

      await checkUserByOrderIdOrAdmin(req, res, next);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: { userId: true },
      });
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should throw error when is not admin and not match order's userId and req.user.id", async () => {
      req.user = {
        id: "not match",
        isAdmin: false,
      };

      prisma.order.findUnique.mockResolvedValue({ userId });

      await checkUserByOrderIdOrAdmin(req, res, next);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: { userId: true },
      });
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("권한이 없습니다."));
    });

    it("should throw error when there is no order corresponding to that orderId", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await checkUserByOrderIdOrAdmin(req, res, next);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: { userId: true },
      });
      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("요청하신 주문 정보가 없습니다."));
    });
  });

  describe("checkUserByUserId", () => {
    const userId = "userId";
    it("should call next when match req.user.id and params' userId", async () => {
      req.params = {
        userId,
      };

      req.user = {
        id: userId,
      };

      await checkUserByUserId(req, res, next);

      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith();
    });

    it("should throw error when not match req.user.id and params' userId", async () => {
      req.params = {
        userId,
      };

      req.user = {
        id: "not match",
      };

      await checkUserByUserId(req, res, next);

      expect(next).toBeCalledTimes(1);
      expect(next).toBeCalledWith(new Error("권한이 없습니다."));
    });
  });
});
