import { prisma } from "../app.js";
import { sendEmail } from "../libs/email-service.js";
import HttpException from "../libs/http-exception.js";
import { CreateOrderItemValidator } from "../libs/validators/orderItem.validator.js";

export const getOrderList = async (req, res) => {
  const orderList = await prisma.order.findMany({
    where: {
      userId: req.user.id,
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

  return res.status(200).json({
    ok: true,
    msg: "주문 내역 조회 성공",
    data: orderList,
  });
};

export const getOrderDetail = async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: {
      id: +orderId,
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

/**
 * 상품 상세 페이지에서 구매하기 클릭 시 사용
 *  새로운 order 만들고, orderItem은 해당 상품 정보 + quantity
 */
export const createOrderByProductId = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = CreateOrderItemValidator.parse(req.body);

  const exProduct = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
  });

  if (!exProduct)
    throw new HttpException("요청하신 상품 정보가 없습니다.", 404);

  // Transaction 필요
  await prisma.order.create({
    data: {
      totalPrice: exProduct.price * quantity,
      user: {
        connect: {
          id: req.user.id,
        },
      },
      orderItems: {
        create: {
          quantity,
          product: {
            connect: {
              id: +productId,
            },
          },
        },
      },
    },
  });

  return res.status(201).end();
};

/**
 * 장바구니에서 주문 시 사용
 * 새로운 order 만들고, 장바구니 내의 모든 cartItem => orderItem
 */
export const createOrderOnCart = async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      product: true,
    },
  });

  // 총 가격 계산
  const totalPrice = cartItems.reduce((total, cartItem) => {
    return total + cartItem.product.price * cartItem.quantity;
  }, 0);

  // order 및 orderItem 만들기
  await prisma.order.create({
    data: {
      totalPrice,
      user: {
        connect: {
          id: req.user.id,
        },
      },
      orderItems: {
        create: cartItems.map((cartItem) => ({
          product: { connect: { id: cartItem.productId } },
          quantity: cartItem.quantity,
        })),
      },
    },
    include: {
      orderItems: true,
    },
  });

  // 장바구니 비우기
  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: {
        userId: req.user.id,
      },
    }),
  ]);

  return res.status(201).end();
};

export const deleteOrder = async (req, res) => {
  const { orderId } = req.params;

  await prisma.order.delete({
    where: {
      id: +orderId,
    },
  });

  return res.status(204).end();
};

export const paymentSuccess = async (req, res) => {
  const { orderId } = req.params;

  await prisma.order.update({
    where: {
      id: +orderId,
    },
    data: {
      isPaid: true,
    },
  });

  await sendEmail("ORDER", req.user.email);

  return res.status(204).end();
};
