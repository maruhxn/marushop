import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs-extra";
import { prisma } from "../app.js";
import CONFIGS from "../configs/contant.js";
import { BUCKET_NAME, s3 } from "../configs/s3-client.js";
import HttpException from "../libs/http-exception.js";
import { createSlug } from "../libs/utils.js";
import {
  CreateProductValidator,
  UpdateProductValidator,
} from "../libs/validators/product.validator.js";
import { ProductsQueryValidator } from "../libs/validators/products-query.validator.js";

export const getAllProducts = async (req, res) => {
  const {
    categoryId,
    page = 1,
    sortQuery,
  } = ProductsQueryValidator.parse(req.query);
  const products = await prisma.product.findMany({
    where: {
      categoryId: categoryId && +categoryId,
    },
    include: {
      images: {
        select: {
          imagePath: true,
        },
      },
    },
    take: CONFIGS.PAGESIZE,
    skip: (page - 1) * CONFIGS.PAGESIZE,
    orderBy: [
      sortQuery && sortQuery === "price_asc"
        ? { price: "asc" }
        : { price: "desc" },
      { title: "asc" },
    ],
  });

  if (products.length <= 0)
    throw new HttpException("상품 정보가 없습니다.", 404);
  return res.status(200).json({
    ok: true,
    msg: "전체 상품 조회 완료.",
    data: products,
  });
};

export const createProduct = async (req, res) => {
  if (req.files.length <= 0)
    throw new HttpException("이미지를 제공해주세요.", 400);

  const { title, description, price, categoryId } =
    CreateProductValidator.parse(req.body);
  const slug = createSlug(title);

  const newProduct = await prisma.product.create({
    data: {
      title,
      description,
      price: +price,
      slug,
      categoryId: +categoryId,
    },
  });

  await prisma.image.createMany({
    data: req.files.map((file) => ({
      imageName: file.key.split("/").pop(),
      imagePath: file.location,
      productId: newProduct.id,
    })),
  });

  return res.status(201).end();
};

export const getProductById = async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
    include: {
      category: true,
      images: {
        select: {
          imagePath: true,
        },
      },
    },
  });

  if (!product) throw new HttpException("상품 정보가 없습니다.", 404);

  return res.json({
    ok: true,
    msg: "상품 조회 성공",
    data: product,
  });
};

export const updateProductById = async (req, res) => {
  const { productId } = req.params;
  const updateProductDto = UpdateProductValidator.parse(req.body);

  if (Object.keys(updateProductDto).length <= 0)
    throw new HttpException("수정 데이터를 1개 이상 입력해주세요", 400);

  const { title, description, price, categoryId } = updateProductDto;

  await prisma.product.update({
    where: {
      id: +productId,
    },
    data: {
      title,
      slug: title ? createSlug(title) : undefined,
      description,
      price,
      categoryId: categoryId && +categoryId,
    },
  });

  return res.status(204).end();
};

export const deleteProductById = async (req, res) => {
  const { productId } = req.params;
  const imageDirPath = "product-images/" + productId;

  await prisma.product.delete({
    where: {
      id: +productId,
    },
  });

  await fs.remove(imageDirPath);
  return res.status(204).end();
};

export const uploadGalleryImage = async (req, res) => {
  const { productId } = req.params;

  await prisma.image.create({
    data: {
      imageName: req.file.key.split("/").pop(),
      imagePath: req.file.location,
      productId: +productId,
    },
  });

  return res.status(201).end();
};

export const deleteGalleryImages = async (req, res) => {
  const { productId, imageName } = req.params;

  await prisma.image.delete({
    where: {
      imageName,
      productId: +productId,
    },
  });

  const deleteCommand = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `product-images/${imageName}`,
  });

  await s3.send(deleteCommand);

  return res.status(204).end();
};
