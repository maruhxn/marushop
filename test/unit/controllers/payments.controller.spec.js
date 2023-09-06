import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import axios from "axios";
import {
  paymentsCancel,
  paymentsCancelForce,
  paymentsComplete,
  paymentsPrepare,
} from "../../../src/controllers/payments.controller";
import HttpException from "../../../src/libs/http-exception";
import { z } from "zod";
import { sendEmail } from "../../../src/libs/email-service";

jest.mock("axios");

jest.mock("../../../src/libs/email-service", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../../src/configs/prisma-client", () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  product: {
    update: jest.fn(),
  },
  cartItem: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));

let req, res, next;

beforeEach(() => {
  req = httpMocks.createRequest();
  res = httpMocks.createResponse();
  next = jest.fn();
  axios.post = jest.fn();
  axios.get = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Payments Controller", () => {
  describe("paymentsPrepare", () => {
    let authToken = {
      data: {
        response: {
          access_token: "access-token",
        },
      },
    };
    beforeEach(() => {
      req.body = {
        amount: 1,
        merchant_uid: "merchantUid",
        tel: "tel",
        address: "address",
        postcode: "postcode",
      };
      req.user = {
        id: "userId",
      };
      req.session = {
        selectedItems: [
          {
            product: { id: "productId1", stock: 2 },
            quantity: 2,
          },
          {
            product: { id: "productId2", stock: 2 },
            quantity: 2,
          },
          {
            product: { id: "productId3", stock: 2 },
            quantity: 2,
          },
        ],
      };
    });

    it("should create order with isPaid:false & portone pre-payment info", async () => {
      const successPrepareResult = {
        data: {
          code: 0,
          message: "성공",
        },
      };

      axios.post.mockImplementation((url, body, option) => {
        if (url === "https://api.iamport.kr/users/getToken") {
          return authToken;
        } else {
          return successPrepareResult;
        }
      });

      await paymentsPrepare(req, res);

      expect(prisma.order.create).toBeCalledTimes(1);
      expect(prisma.order.create).toBeCalledWith({
        data: {
          id: req.body.merchant_uid,
          totalPrice: req.body.amount,
          userId: req.user.id,
          orderItems: {
            create: req.session.selectedItems.map((cartItem) => ({
              productId: cartItem.product.id,
              quantity: cartItem.quantity,
            })),
          },
          address: req.body.address,
          tel: req.body.tel,
          postcode: req.body.postcode,
        },
        include: {
          orderItems: true,
        },
      });
      expect(axios.post).toBeCalledTimes(2);
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });

    describe("409 error", () => {
      beforeEach(() => {
        req.body = {
          amount: 1,
          merchant_uid: "merchantUid",
          tel: "tel",
          address: "address",
          postcode: "postcode",
        };
      });

      // 재고 부족 - 이미 품절
      it("should throw 409 error when it is already sold-out", async () => {
        req.session = {
          selectedItems: [
            {
              product: { id: "productId1", stock: 0 },
              quantity: 2,
            },
            {
              product: { id: "productId2", stock: 2 },
              quantity: 2,
            },
          ],
        };

        try {
          await paymentsPrepare(req, res);
        } catch (error) {
          expect(prisma.order.create).toBeCalledTimes(0);
          expect(axios.post).toBeCalledTimes(0);
          expect(error.status).toBe(409);
          expect(error.message).toBe("재고가 부족합니다.");
          expect(error).toBeInstanceOf(HttpException);
        }
      });

      // 재고 부족 - 남은 수량보다 더 많이 구매
      it("should throw 409 error when quantity is over stock", async () => {
        req.session = {
          selectedItems: [
            {
              product: { id: "productId1", stock: 1 },
              quantity: 2,
            },
            {
              product: { id: "productId2", stock: 2 },
              quantity: 2,
            },
          ],
        };

        try {
          await paymentsPrepare(req, res);
        } catch (error) {
          expect(prisma.order.create).toBeCalledTimes(0);
          expect(axios.post).toBeCalledTimes(0);
          expect(error.status).toBe(409);
          expect(error.message).toBe("재고가 부족합니다.");
          expect(error).toBeInstanceOf(HttpException);
        }
      });
    });

    // validation error
    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await paymentsPrepare(req, res);
      } catch (error) {
        expect(prisma.order.create).toBeCalledTimes(0);
        expect(axios.post).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    // 사전 결제 정보 등록 중 에러
    it("should throw 400 error when code is not 0", async () => {
      const failPrepareResult = {
        data: {
          code: 1,
          message: "존재하지 않는 결제정보입니다.",
        },
      };

      axios.post.mockImplementation((url, body, option) => {
        if (url === "https://api.iamport.kr/users/getToken") {
          return authToken;
        } else {
          return failPrepareResult;
        }
      });

      try {
        await paymentsPrepare(req, res);
      } catch (error) {
        expect(prisma.order.create).toBeCalledTimes(0);
        expect(axios.post).toBeCalledTimes(2);
        expect(error.status).toBe(400);
        expect(error.message).toBe(
          `결제 정보 사전 등록 중 에러 - ${failPrepareResult.data.message}`
        );
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("paymentsComplete", () => {
    const authToken = {
      data: {
        response: {
          access_token: "access-token",
        },
      },
    };
    beforeEach(() => {
      req.session = {
        selectedItems: [{}, {}],
      };
      req.user = {
        id: "userId",
        email: "email",
      };
      req.body = {
        imp_uid: "impUid",
        merchant_uid: "merchantUid",
      };
      axios.post.mockResolvedValue(authToken);
    });
    it("should update order status, decrease product stock, clean cartItems when match order.totalPrice and paymentData's amount", async () => {
      const paymentData = {
        data: {
          response: {
            amount: 1,
            status: "paid",
          },
        },
      };
      const order = {
        orderItems: [{ productId: "productId" }],
        totalPrice: 1,
      };

      axios.get.mockResolvedValue(paymentData);
      prisma.order.findUnique.mockResolvedValue(order);

      await paymentsComplete(req, res);

      expect(axios.post).toBeCalledTimes(1);
      expect(axios.get).toBeCalledTimes(1);
      expect(prisma.order.findUnique).toBeCalledTimes(1);
      expect(prisma.order.findUnique).toBeCalledWith({
        where: {
          id: req.body.merchant_uid,
        },
        include: {
          orderItems: true,
        },
      });
      expect(prisma.order.update).toBeCalledTimes(1);
      expect(prisma.product.update).toBeCalledTimes(order.orderItems.length);
      expect(prisma.cartItem.deleteMany).toBeCalledTimes(1);
      expect(prisma.$transaction).toBeCalledTimes(1);
      expect(req.session.selectedItems).toBeNull();
      expect(sendEmail).toBeCalledTimes(1);
      expect(sendEmail).toBeCalledWith("ORDER", req.user.email);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "결제 성공",
      });
    });

    // validation error
    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await paymentsComplete(req, res);
      } catch (error) {
        expect(prisma.order.update).toBeCalledTimes(0);
        expect(prisma.product.update).toBeCalledTimes(0);
        expect(prisma.cartItem.deleteMany).toBeCalledTimes(0);
        expect(prisma.$transaction).toBeCalledTimes(0);
        expect(sendEmail).toBeCalledTimes(0);
        expect(axios.post).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    it("should throw 400 error when payment amount mismatch", async () => {
      const paymentData = {
        data: {
          response: {
            amount: 1,
            status: "paid",
          },
        },
      };
      const order = {
        orderItems: [{ productId: "productId" }],
        totalPrice: 3,
      };

      axios.get.mockResolvedValue(paymentData);
      prisma.order.findUnique.mockResolvedValue(order);

      try {
        await paymentsComplete(req, res);
      } catch (error) {
        expect(axios.post).toBeCalledTimes(1);
        expect(axios.get).toBeCalledTimes(1);
        expect(prisma.order.findUnique).toBeCalledTimes(1);
        expect(prisma.order.findUnique).toBeCalledWith({
          where: {
            id: req.body.merchant_uid,
          },
          include: {
            orderItems: true,
          },
        });
        expect(prisma.order.update).toBeCalledTimes(0);
        expect(prisma.product.update).toBeCalledTimes(0);
        expect(prisma.cartItem.deleteMany).toBeCalledTimes(0);
        expect(prisma.$transaction).toBeCalledTimes(0);
        expect(sendEmail).toBeCalledTimes(0);
        expect(error.status).toBe(400);
        expect(error.message).toBe("위조된 결제시도");
      }
    });

    it("should throw 501 error when try vbank payment", async () => {
      const paymentData = {
        data: {
          response: {
            amount: 1,
            status: "ready",
          },
        },
      };
      const order = {
        orderItems: [{ productId: "productId" }],
        totalPrice: 1,
      };

      axios.get.mockResolvedValue(paymentData);
      prisma.order.findUnique.mockResolvedValue(order);

      try {
        await paymentsComplete(req, res);
      } catch (error) {
        expect(axios.post).toBeCalledTimes(1);
        expect(axios.get).toBeCalledTimes(1);
        expect(prisma.order.findUnique).toBeCalledTimes(1);
        expect(prisma.order.findUnique).toBeCalledWith({
          where: {
            id: req.body.merchant_uid,
          },
          include: {
            orderItems: true,
          },
        });
        expect(prisma.order.update).toBeCalledTimes(0);
        expect(prisma.product.update).toBeCalledTimes(0);
        expect(prisma.cartItem.deleteMany).toBeCalledTimes(0);
        expect(prisma.$transaction).toBeCalledTimes(0);
        expect(sendEmail).toBeCalledTimes(0);
        expect(error.status).toBe(501);
        expect(error.message).toBe("준비 중입니다.");
      }
    });
  });

  describe("paymentsCancelForce", () => {
    let authToken = {
      data: {
        response: {
          access_token: "access-token",
        },
      },
    };

    beforeEach(() => {
      axios.post.mockImplementation((url, body, option) => {
        if (url === "https://api.iamport.kr/users/getToken") {
          return authToken;
        } else {
          return null;
        }
      });
    });

    it("should full refund successfully", async () => {
      req.body = {
        imp_uid: "paymentId",
        reason: "reason",
        cancel_request_amount: 1,
      };

      await paymentsCancelForce(req, res);

      expect(axios.post).toBeCalledTimes(2);
      expect(axios.post.mock.calls[0][0]).toBe(
        "https://api.iamport.kr/users/getToken"
      );
      expect(axios.post.mock.calls[0][1]).toStrictEqual({
        imp_key: "TEST_KEY",
        imp_secret: "TEST_SECRET",
      });
      expect(axios.post.mock.calls[1][0]).toBe(
        "https://api.iamport.kr/payments/cancel"
      );
      expect(axios.post.mock.calls[1][1]).toStrictEqual({
        reason: req.body.reason,
        imp_uid: req.body.imp_uid,
        amount: req.body.cancel_request_amount,
        checksum: 0,
      });
      expect(axios.post.mock.calls[1][2]).toStrictEqual({
        headers: { Authorization: authToken.data.response.access_token },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    // validation error
    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await paymentsCancelForce(req, res);
      } catch (error) {
        expect(axios.post).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("paymentsCancel", () => {
    let authToken = {
      data: {
        response: {
          access_token: "access-token",
        },
      },
    };

    it("should refund successfully", async () => {
      req.body = {
        merchant_uid: "orderId",
        reason: "reason",
        cancel_request_amount: 1,
      };
      const paymentData = {
        id: "paymentId",
        amount: 2,
        cancel_amount: 0,
      };

      const cancelData = {
        data: {
          response: {
            merchant_uid: "orderId",
          },
        },
      };

      prisma.payment.findFirst.mockResolvedValue(paymentData);
      axios.post.mockImplementation((url, body, option) => {
        if (url === "https://api.iamport.kr/users/getToken") {
          return authToken;
        } else {
          return cancelData;
        }
      });
      await paymentsCancel(req, res);

      expect(axios.post).toBeCalledTimes(2);
      expect(axios.post.mock.calls[0][0]).toBe(
        "https://api.iamport.kr/users/getToken"
      );
      expect(axios.post.mock.calls[0][1]).toStrictEqual({
        imp_key: "TEST_KEY",
        imp_secret: "TEST_SECRET",
      });
      expect(axios.post.mock.calls[1][0]).toBe(
        "https://api.iamport.kr/payments/cancel"
      );
      expect(axios.post.mock.calls[1][1]).toStrictEqual({
        reason: req.body.reason,
        imp_uid: paymentData.id,
        amount: req.body.cancel_request_amount,
        checksum: paymentData.amount - paymentData.cancel_amount,
      });
      expect(axios.post.mock.calls[1][2]).toStrictEqual({
        headers: { Authorization: authToken.data.response.access_token },
      });
      expect(prisma.payment.findFirst).toBeCalledTimes(1);
      expect(prisma.payment.update).toBeCalledTimes(1);
      expect(prisma.payment.update).toBeCalledWith({
        where: {
          orderId: cancelData.data.response.merchant_uid,
        },
        data: {
          cancel_amount: {
            increment: req.body.cancel_request_amount,
          },
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    // validation error
    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await paymentsCancel(req, res);
      } catch (error) {
        expect(axios.post).toBeCalledTimes(0);
        expect(prisma.payment.findFirst).toBeCalledTimes(0);
        expect(prisma.payment.update).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    // 환불 가능한 금액이 없는 경우
    it("should refund successfully", async () => {
      req.body = {
        merchant_uid: "orderId",
        reason: "reason",
        cancel_request_amount: 1,
      };
      const paymentData = {
        id: "paymentId",
        amount: 1,
        cancel_amount: 2,
      };

      prisma.payment.findFirst.mockResolvedValue(paymentData);
      axios.post.mockResolvedValue(authToken);

      try {
        await paymentsCancel(req, res);
      } catch (error) {
        expect(axios.post).toBeCalledTimes(1);
        expect(prisma.payment.findFirst).toBeCalledTimes(1);
        expect(prisma.payment.update).toBeCalledTimes(0);
        expect(error.status).toBe(409);
        expect(error.message).toBe("환불이 불가합니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });
});
