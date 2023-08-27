import { prisma } from "../app.js";

export const getAllProducts = async (req, res, next) => {
  const products = await prisma.product.findMany();
  return res.status(200).json({
    ok: true,
    msg: "전체 상품 조회 완료.",
    data: products,
  });
};
