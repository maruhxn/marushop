import { prisma } from "../app.js";
import CONFIGS from "../configs/contant.js";
import HttpException from "../libs/http-exception.js";
import { OrderQueryValidator } from "../libs/validators/order-query.validator.js";

export const getAllOrders = async (req, res) => {
  const { page = 1 } = OrderQueryValidator.parse(req.query);
  const orders = await prisma.order.findMany({
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
    skip: (page - 1) * CONFIGS.PAGESIZE,
    orderBy: [{ orderDate: "asc" }],
  });

  if (orders.length <= 0) throw new HttpException("주문 내역이 없습니다.", 404);
  return res.status(200).json({
    ok: true,
    msg: "전체 주문 내역 조회 성공.",
    data: orders,
  });
};

export const getOrdersByProductId = async (req, res) => {
  const { productId } = req.params;
  const ordersByProductId = await prisma.order.findMany({
    where: {
      orderItems: {
        every: {
          productId,
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

  if (ordersByProductId.length <= 0)
    throw new HttpException("해당 상품에 대한 주문 내역이 없습니다.", 404);
  return res.status(200).json({
    ok: true,
    msg: "상품별 주문 내역 조회 성공.",
    data: ordersByProductId,
  });
};

export const getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;
  const ordersByUserId = await prisma.order.findMany({
    where: {
      userId,
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

  if (ordersByUserId.length <= 0)
    throw new HttpException("해당 유저의 주문 내역이 없습니다.", 404);

  return res.status(200).json({
    ok: true,
    msg: "유저별 주문 내역 조회 성공.",
    data: ordersByUserId,
  });
};

export const getOrderDetail = async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
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

  return res.status(200).json({
    ok: true,
    msg: `주문번호 - ${order.id} 조회 성공`,
    data: order,
  });
};

export const deleteOrder = async (req, res) => {
  const { orderId } = req.params;

  await prisma.order.delete({
    where: {
      id: orderId,
    },
  });

  return res.status(204).end();
};

// 결제정보 사후 요청
export const paymentSuccess = async (req, res) => {
  const { orderId } = req.params;

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      isPaid: true,
    },
  });

  return res.status(204).end();
};
