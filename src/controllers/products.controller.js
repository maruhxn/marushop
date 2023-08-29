import fs from "fs-extra";
import ResizeImg from "resize-img";
import { prisma } from "../app.js";
import CONFIGS from "../configs/contant.js";
import HttpException from "../libs/http-exception.js";
import { createSlug } from "../libs/utils.js";
import { CreateProductValidator } from "../libs/validators/product.validator.js";
import { QueryValidator } from "../libs/validators/query.validator.js";

export const getAllProducts = async (req, res) => {
  const { categoryId, page = 1, sortQuery } = QueryValidator.parse(req.query);
  const products = await prisma.product.findMany({
    where: {
      categoryId: categoryId && +categoryId,
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
  const productImage = req.files.image;
  const imageFile = productImage.name;
  const { title, description, price, categoryId } =
    CreateProductValidator.parse(req.body);
  const slug = createSlug(title);

  // 데이터베이스에 저장

  const exCategory = await prisma.category.findFirst({
    where: {
      id: +categoryId,
    },
  });
  if (!exCategory)
    throw new HttpException("요청하신 카테고리 정보가 없습니다.", 404);

  const newProduct = await prisma.product.create({
    data: {
      title,
      description,
      price: +price,
      slug,
      categoryId: +categoryId,
      image: imageFile,
    },
  });

  // 이미지 담을 폴더 생성
  await fs.mkdirp("product-images/" + newProduct.id);
  await fs.mkdirp("product-images/" + newProduct.id + "/gallery");
  await fs.mkdirp("product-images/" + newProduct.id + "/gallery/thumbnail");

  // 로컬에 이미지 저장
  const imagePath = "product-images/" + newProduct.id + "/" + imageFile;
  await productImage.mv(imagePath);

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
    },
  });

  if (!product) throw new HttpException("상품 정보가 없습니다.", 404);

  const galleryDir = "product-images/" + product.id + "/gallery";

  const galleryImages = await fs.readdir(galleryDir);

  return res.json({
    ok: true,
    msg: "상품 조회 성공",
    data: { ...product, galleryImages },
  });
};

export const deleteProductById = async (req, res) => {
  const { productId } = req.params;
  const imageDirPath = "product-images/" + productId;

  const product = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
  });

  if (!product) throw new HttpException("상품 정보가 없습니다.", 404);

  await prisma.product.delete({
    where: {
      id: +productId,
    },
  });

  await fs.remove(imageDirPath);
  return res.status(204).end();
};

export const uploadGalleryImages = async (req, res) => {
  const productImage = req.files.file;

  const { productId } = req.params;

  const product = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
  });

  if (!product) throw new HttpException("상품 정보가 없습니다.", 404);

  const path =
    "product-images/" + productId + "/gallery/" + req.files.file.name;
  const thumbnailPath =
    "product-images/" + productId + "/gallery/thumbnail/" + req.files.file.name;

  // 원본 -> gallery 폴더
  await productImage.mv(path);

  // 이미지 리사이즈
  const buf = await ResizeImg(fs.readFileSync(path), {
    width: 100,
    height: 100,
  });

  fs.writeFileSync(thumbnailPath, buf);

  return res.status(201).end();
};

export const deleteGalleryImages = async (req, res) => {
  const { productId, imageName } = req.params;

  const product = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
  });

  if (!product) throw new HttpException("상품 정보가 없습니다.", 404);

  const originalImgPath =
    "product-images/" + productId + "/gallery/" + imageName;
  const thumbnailImgPath =
    "product-images/" + productId + "/gallery/thumbnail/" + imageName;

  await fs.remove(originalImgPath);
  await fs.remove(thumbnailImgPath);

  return res.status(204).end();
};
