// 5개 단순 CRUD
import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  deleteOrder,
  getAllOrders,
  getOrderDetail,
  getOrdersByProductId,
  getOrdersByUserId,
} from "../../../src/controllers/order.controller";
import CONFIGS from "../../../src/configs/contant";
import HttpException from "../../../src/libs/http-exception";

jest.mock("../../../src/configs/prisma-client", () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}));

let req, res, next;

beforeEach(() => {
  req = httpMocks.createRequest();
  res = httpMocks.createResponse();
  next = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Order Controller", () => {
  describe("getAllOrders", () => {
    it("should return order data as many times as PAGESIZE", async () => {
      const orders = [{}, {}, {}];
      req.query = {
        page: "1",
      };
      prisma.order.findMany.mockResolvedValue(orders);

      await getAllOrders(req, res);

      expect(prisma.order.findMany).toBeCalledTimes(1);
      expect(prisma.order.findMany).toBeCalledWith({
        include: {
          orderItems: {
            select: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: (req.query.page - 1) * CONFIGS.PAGESIZE,
        orderBy: [{ orderDate: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 주문 내역 조회 성공.",
        data: orders,
      });
    });

    it("should set default page to 1", async () => {
      const orders = [{}, {}, {}];
      prisma.order.findMany.mockResolvedValue(orders);

      await getAllOrders(req, res);

      expect(prisma.order.findMany).toBeCalledTimes(1);
      expect(prisma.order.findMany).toBeCalledWith({
        include: {
          orderItems: {
            select: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: 0,
        orderBy: [{ orderDate: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 주문 내역 조회 성공.",
        data: orders,
      });
    });

    it("should throw 404 error when there is no orders", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      try {
        await getAllOrders(req, res);
      } catch (error) {
        expect(prisma.order.findMany).toBeCalledTimes(1);
        expect(prisma.order.findMany).toBeCalledWith({
          include: {
            orderItems: {
              select: {
                product: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          take: CONFIGS.PAGESIZE,
          skip: 0,
          orderBy: [{ orderDate: "asc" }],
        });
        expect(error.status).toBe(404);
        expect(error.message).toBe("주문 내역이 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw zod error when receive invalid query", async () => {
      req.query = {
        page: 1,
      };

      try {
        await getAllOrders(req, res);
      } catch (error) {
        expect(prisma.order.findMany).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("getOrdersByProductId", () => {
    it("should return order data by productId", async () => {
      const ordersByProductId = [{}, {}, {}];
      req.params = {
        productId: "productId",
      };
      prisma.order.findMany.mockResolvedValue(ordersByProductId);

      await getOrdersByProductId(req, res);

      expect(prisma.order.findMany).toBeCalledTimes(1);
      expect(prisma.order.findMany).toBeCalledWith({
        where: {
          orderItems: {
            every: {
              productId: req.params.productId,
            },
          },
        },
        include: {
          orderItems: {
            select: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "상품별 주문 내역 조회 성공.",
        data: ordersByProductId,
      });
    });

    it("should throw 404 error when there is no orders", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      try {
        await getOrdersByProductId(req, res);
      } catch (error) {
        expect(prisma.order.findMany).toBeCalledTimes(1);
        expect(prisma.order.findMany).toBeCalledWith({
          where: {
            orderItems: {
              every: {
                productId: req.params.productId,
              },
            },
          },
          include: {
            orderItems: {
              select: {
                product: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        });
        expect(error.status).toBe(404);
        expect(error.message).toBe("해당 상품에 대한 주문 내역이 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("getOrdersByUserId", () => {
    it("should return order data by userId", async () => {
      const ordersByUserId = [{}, {}, {}];
      req.params = {
        userId: "userId",
      };
      prisma.order.findMany.mockResolvedValue(ordersByUserId);

      await getOrdersByUserId(req, res);

      expect(prisma.order.findMany).toBeCalledTimes(1);
      expect(prisma.order.findMany).toBeCalledWith({
        where: {
          userId: req.params.userId,
        },
        include: {
          orderItems: {
            select: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "유저별 주문 내역 조회 성공.",
        data: ordersByUserId,
      });
    });

    it("should throw 404 error when there is no orders", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      try {
        await getOrdersByUserId(req, res);
      } catch (error) {
        expect(prisma.order.findMany).toBeCalledTimes(1);
        expect(prisma.order.findMany).toBeCalledWith({
          where: {
            userId: req.params.userId,
          },
          include: {
            orderItems: {
              select: {
                product: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        });
        expect(error.status).toBe(404);
        expect(error.message).toBe("해당 유저의 주문 내역이 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("getOrderDetail", () => {
    beforeEach(() => {
      req.params = {
        orderId: "productId",
      };
    });
    it("should return order detail successfully", async () => {
      const order = {};

      prisma.order.findUnique.mockResolvedValue(order);

      await getOrderDetail(req, res);

      expect(prisma.order.findUnique).toBeCalledTimes(1);
      expect(prisma.order.findUnique).toBeCalledWith({
        where: {
          id: req.params.orderId,
        },
        include: {
          orderItems: true,
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: `주문번호 - ${order.id} 조회 성공`,
        data: order,
      });
    });

    it("should throw 404 error when there is no order", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      try {
        await getOrderDetail(req, res);
      } catch (error) {
        expect(prisma.order.findUnique).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(HttpException);
        expect(error.status).toBe(404);
        expect(error.message).toBe("주문 정보가 없습니다.");
      }
    });
  });

  describe("deleteOrder", () => {
    beforeEach(() => {
      req.params = {
        orderId: "orderId",
      };
    });

    it("should delete order successfully", async () => {
      await deleteOrder(req, res);

      expect(prisma.order.delete).toBeCalledTimes(1);
      expect(prisma.order.delete).toBeCalledWith({
        where: {
          id: req.params.orderId,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.order.delete.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await deleteOrder(req, res);
      } catch (error) {
        expect(prisma.order.delete).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });
});
