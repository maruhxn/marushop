import { prisma } from "../app.js";
import HttpException from "../libs/http-exception.js";
import { CartItemActionTypeValidator } from "../libs/validators/actionType.validator.js";
import { CreateCartItemValidator } from "../libs/validators/cartItem.validator.js";

export const getAllCartItems = async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId: req.user.id,
    },
    select: {
      product: true,
      quantity: true,
    },
  });

  return res.status(200).json({
    ok: true,
    msg: "장바구니 목록 조회 성공.",
    data: cartItems,
  });
};

export const addProductToCart = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = CreateCartItemValidator.parse(req.body);

  const exProduct = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!exProduct)
    throw new HttpException("요청하신 상품 정보가 없습니다.", 404);

  // 있다면 해당 장바구니에 이미 cartItem이 있는지 확인
  const exCartItem = await prisma.cartItem.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  // cartItem이 없다면, 생성
  if (!exCartItem) {
    await prisma.cartItem.create({
      data: {
        userId: req.user.id,
        productId,
        quantity,
      },
    });
  } else {
    // cartItem이 있다면, 수량 수정
    await prisma.cartItem.update({
      where: {
        userId_productId: { userId: req.user.id, productId },
      },
      data: {
        quantity: exCartItem.quantity + quantity,
      },
    });
  }

  res.status(201).end();
};

export const updateCartItem = async (req, res) => {
  const { actionType } = CartItemActionTypeValidator.parse(req.query);
  const { productId } = req.params;

  const exCartItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        productId,
        userId: req.user.id,
      },
    },
  });

  if (!exCartItem)
    throw new HttpException("장바구니 상품 정보가 없습니다.", 404);
  // quantity 0보다 작아지지 않게
  await prisma.cartItem.update({
    where: {
      userId_productId: {
        productId,
        userId: req.user.id,
      },
    },
    data: {
      quantity: {
        increment: actionType === "inc" ? 1 : -1,
      },
    },
  });

  res.status(204).end();
};

export const deleteCartItem = async (req, res) => {
  const { productId } = req.params;

  const exCartItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        productId,
        userId: req.user.id,
      },
    },
  });

  if (!exCartItem)
    throw new HttpException("장바구니 상품 정보가 없습니다.", 404);

  await prisma.cartItem.delete({
    where: {
      userId_productId: {
        productId,
        userId: req.user.id,
      },
    },
  });
  res.status(204).end();
};

export const addSelectedItemsToSession = async (req, res) => {
  const { selectedCartItemIds } = req.body;
  const selectedCartItems = await prisma.cartItem.findMany({
    where: {
      userId: req.user.id,
      productId: {
        in: selectedCartItemIds,
      },
    },
    select: {
      product: true,
      quantity: true,
    },
  });

  req.session.selectedItems = selectedCartItems;

  res.status(201).end();
};
