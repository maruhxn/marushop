import {
  addProductToCart,
  addSelectedItemsToSession,
  deleteCartItem,
  getAllCartItems,
  updateCartItem,
} from "../../../src/controllers/cart.controller";
import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import { Prisma } from "@prisma/client";
import { z } from "zod";

jest.mock("../../../src/configs/prisma-client", () => ({
  cartItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

describe("Cart Controller", () => {
  describe("getAllCartItems", () => {
    it("should return All cartItems", async () => {
      const cartItems = [{}, {}, {}];

      req.user = {
        id: "userId",
      };

      prisma.cartItem.findMany.mockResolvedValue(cartItems);

      await getAllCartItems(req, res);

      expect(prisma.cartItem.findMany).toBeCalledTimes(1);
      expect(prisma.cartItem.findMany).toBeCalledWith({
        where: {
          userId: req.user.id,
        },
        select: {
          product: {
            include: {
              images: true,
            },
          },
          quantity: true,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "장바구니 목록 조회 성공.",
        data: cartItems,
      });
    });
  });

  describe("addProductToCart", () => {
    it("should create new cartItem successfully when there is no exCartItem", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.body = {
        quantity: 1,
      };

      prisma.cartItem.findFirst.mockResolvedValue(null);

      await addProductToCart(req, res);

      expect(prisma.cartItem.create).toBeCalledTimes(1);
      expect(prisma.cartItem.create).toBeCalledWith({
        data: {
          userId: req.user.id,
          productId: req.params.productId,
          quantity: req.body.quantity,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should update exCartItem's quantity when there is exCartItem", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.body = {
        quantity: 1,
      };

      const exCartItem = {
        quantity: 1,
      };

      prisma.cartItem.findFirst.mockResolvedValue(exCartItem);

      await addProductToCart(req, res);

      expect(prisma.cartItem.update).toBeCalledTimes(1);
      expect(prisma.cartItem.update).toBeCalledWith({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId: req.params.productId,
          },
        },
        data: {
          quantity: exCartItem.quantity + req.body.quantity,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.body = {
        quantity: 1,
      };

      const errorCode = "P2003";

      prisma.cartItem.findFirst.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError("상품 정보 없음", {
          code: errorCode,
        });
      });

      try {
        await addProductToCart(req, res);
      } catch (error) {
        expect(prisma.cartItem.update).toBeCalledTimes(0);
        expect(prisma.cartItem.create).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });

  describe("updateCartItem", () => {
    it("should increase exCartItem's quantity successfully when actionType is 'inc'", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.query = {
        actionType: "inc",
      };

      await updateCartItem(req, res);

      expect(prisma.cartItem.update).toBeCalledTimes(1);
      expect(prisma.cartItem.update).toBeCalledWith({
        where: {
          userId_productId: {
            productId: req.params.productId,
            userId: req.user.id,
          },
        },
        data: {
          quantity: {
            increment: 1,
          },
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should decrease exCartItem's quantity successfully when actionType is 'dec'", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.query = {
        actionType: "dec",
      };

      await updateCartItem(req, res);

      expect(prisma.cartItem.update).toBeCalledTimes(1);
      expect(prisma.cartItem.update).toBeCalledWith({
        where: {
          userId_productId: {
            productId: req.params.productId,
            userId: req.user.id,
          },
        },
        data: {
          quantity: {
            increment: -1,
          },
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.query = {
        actionType: "inc",
      };

      const errorCode = "P2025";

      prisma.cartItem.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await updateCartItem(req, res);
      } catch (error) {
        expect(prisma.cartItem.update).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });

    it("should throw 400 error when receive invalid query", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.query = {
        actionType: "hack",
      };

      try {
        await updateCartItem(req, res);
      } catch (error) {
        expect(prisma.cartItem.update).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("deleteCartItem", () => {
    it("should delete cartItem successfully", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };

      await deleteCartItem(req, res);

      expect(prisma.cartItem.delete).toBeCalledTimes(1);
      expect(prisma.cartItem.delete).toBeCalledWith({
        where: {
          userId_productId: {
            productId: req.params.productId,
            userId: req.user.id,
          },
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      req.params = {
        productId: "productId",
      };
      req.user = {
        id: "userId",
      };
      req.query = {
        actionType: "inc",
      };

      const errorCode = "P2025";

      prisma.cartItem.delete.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await deleteCartItem(req, res);
      } catch (error) {
        expect(prisma.cartItem.delete).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });

  describe("addSelectedItemsToSession", () => {
    let selectedCartItems;
    beforeEach(() => {
      req.user = {
        id: "userId",
      };

      req.session = {
        selectedItems: null,
      };
      selectedCartItems = [{}, {}, {}];
    });
    it("should add selected cartItems to req.session successfully", async () => {
      req.body = {
        selectedCartItemIds: ["cartItemId1", "cartItemId2"],
      };

      prisma.cartItem.findMany.mockResolvedValue(selectedCartItems);

      await addSelectedItemsToSession(req, res);

      expect(prisma.cartItem.findMany).toBeCalledTimes(1);
      expect(prisma.cartItem.findMany).toBeCalledWith({
        where: {
          userId: req.user.id,
          productId: {
            in: req.body.selectedCartItemIds,
          },
        },
        select: {
          product: {
            include: {
              images: true,
            },
          },
          quantity: true,
        },
      });
      expect(req.session.selectedItems).toStrictEqual(selectedCartItems);
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });
    it("should throw 400 error when receive invalid data", async () => {
      req.body = {
        selectedCartItemIds: "hack",
      };

      try {
        await addSelectedItemsToSession(req, res);
      } catch (error) {
        expect(prisma.cartItem.findMany).toBeCalledTimes(0);
        expect(req.session.selectedItems).toBeFalsy();
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });
});
