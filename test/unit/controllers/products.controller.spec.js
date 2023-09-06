import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import {
  createProduct,
  deleteGalleryImages,
  deleteProductById,
  getAllProducts,
  getProductById,
  updateProductById,
  uploadGalleryImage,
} from "../../../src/controllers/products.controller";
import CONFIGS from "../../../src/configs/contant";
import HttpException from "../../../src/libs/http-exception";
import { createSlug } from "../../../src/libs/utils";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { mockClient } from "aws-sdk-client-mock";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BUCKET_NAME } from "../../../src/configs/s3-client";
import "aws-sdk-client-mock-jest";

jest.mock("../../../src/configs/prisma-client", () => ({
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  image: {
    create: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../src/libs/utils", () => ({
  createSlug: jest.fn().mockReturnValue("slug"),
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

describe("Products Controller", () => {
  describe("getAllProducts", () => {
    it("should return product data as many times as PAGESIZE (all query)", async () => {
      const products = [{}, {}, {}];
      req.query = {
        categoryId: "categoryId",
        page: "2",
        sortQuery: "price_asc",
      };
      prisma.product.findMany.mockResolvedValue(products);

      await getAllProducts(req, res);

      expect(prisma.product.findMany).toBeCalledTimes(1);
      expect(prisma.product.findMany).toBeCalledWith({
        where: {
          categoryId: req.query.categoryId,
        },
        include: {
          images: {
            select: {
              imagePath: true,
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: (req.query.page - 1) * CONFIGS.PAGESIZE,
        orderBy: [{ price: "asc" }, { title: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 상품 조회 완료.",
        data: products,
      });
    });

    it("should return product data as many times as PAGESIZE (only sortQuery query)", async () => {
      const products = [{}, {}, {}];
      req.query = {
        sortQuery: "price_asc",
      };
      prisma.product.findMany.mockResolvedValue(products);

      await getAllProducts(req, res);

      expect(prisma.product.findMany).toBeCalledTimes(1);
      expect(prisma.product.findMany).toBeCalledWith({
        where: {
          categoryId: undefined,
        },
        include: {
          images: {
            select: {
              imagePath: true,
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: 0,
        orderBy: [{ price: "asc" }, { title: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 상품 조회 완료.",
        data: products,
      });
    });

    it("should return product data as many times as PAGESIZE (only category query)", async () => {
      const products = [{}, {}, {}];
      req.query = {
        categoryId: "categoryId",
      };
      prisma.product.findMany.mockResolvedValue(products);

      await getAllProducts(req, res);

      expect(prisma.product.findMany).toBeCalledTimes(1);
      expect(prisma.product.findMany).toBeCalledWith({
        where: {
          categoryId: "categoryId",
        },
        include: {
          images: {
            select: {
              imagePath: true,
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: 0,
        orderBy: [{ title: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 상품 조회 완료.",
        data: products,
      });
    });

    it("should set default page to 1", async () => {
      req.query = {
        categoryId: "categoryId",
        sortQuery: "price_asc",
      };
      const products = [{}, {}, {}];
      prisma.product.findMany.mockResolvedValue(products);

      await getAllProducts(req, res);

      expect(prisma.product.findMany).toBeCalledTimes(1);
      expect(prisma.product.findMany).toBeCalledWith({
        where: {
          categoryId: req.query.categoryId,
        },
        include: {
          images: {
            select: {
              imagePath: true,
            },
          },
        },
        take: CONFIGS.PAGESIZE,
        skip: 0,
        orderBy: [{ price: "asc" }, { title: "asc" }],
      });
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 상품 조회 완료.",
        data: products,
      });
    });

    it("should throw 404 error when there is no products", async () => {
      prisma.product.findMany.mockResolvedValue([]);

      try {
        await getAllProducts(req, res);
      } catch (error) {
        expect(prisma.product.findMany).toBeCalledTimes(1);
        expect(error.status).toBe(404);
        expect(error.message).toBe("상품 정보가 없습니다.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw zod error when receive invalid query", async () => {
      req.query = {
        page: 1,
      };

      try {
        await getAllProducts(req, res);
      } catch (error) {
        expect(prisma.product.findMany).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("createProduct", () => {
    let newProduct;
    beforeEach(() => {
      req.files = [
        {
          key: "key1",
          location: "location1",
        },
        {
          key: "key2",
          location: "location2",
        },
      ];
      req.body = {
        title: "title",
        description: "description",
        price: "3",
        categoryId: "categoryId",
        stock: "3",
      };

      newProduct = {
        id: "newProductId",
      };
    });
    it("should create product successfully with images", async () => {
      prisma.product.create.mockResolvedValue(newProduct);

      await createProduct(req, res);

      expect(createSlug).toBeCalledTimes(1);
      expect(createSlug).toBeCalledWith(req.body.title);
      expect(prisma.product.create).toBeCalledTimes(1);
      expect(prisma.product.create).toBeCalledWith({
        data: {
          title: req.body.title,
          description: req.body.description,
          price: +req.body.price,
          slug: "slug",
          categoryId: req.body.categoryId,
          stock: +req.body.stock,
        },
      });
      expect(prisma.image.createMany).toBeCalledTimes(1);
      expect(prisma.image.createMany).toBeCalledWith({
        data: req.files.map((file) => ({
          imageName: file.key.split("/").pop(),
          imagePath: file.location,
          productId: newProduct.id,
        })),
      });
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw error when there is no images", async () => {
      req.files = [];

      try {
        await createProduct(req, res);
      } catch (error) {
        expect(createSlug).toBeCalledTimes(0);
        expect(prisma.product.create).toBeCalledTimes(0);
        expect(prisma.image.createMany).toBeCalledTimes(0);
        expect(error.status).toBe(400);
        expect(error.message).toBe("이미지를 제공해주세요.");
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it("should throw error when receive invalid input", async () => {
      req.body = {};

      try {
        await createProduct(req, res);
      } catch (error) {
        expect(createSlug).toBeCalledTimes(0);
        expect(prisma.product.create).toBeCalledTimes(0);
        expect(prisma.image.createMany).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("getProductById", () => {
    beforeEach(() => {
      req.params = {
        productId: "productId",
      };
    });
    it("should return product detail successfully", async () => {
      const product = {};

      prisma.product.findUnique.mockResolvedValue(product);

      await getProductById(req, res);

      expect(prisma.product.findUnique).toBeCalledTimes(1);
      expect(prisma.product.findUnique).toBeCalledWith({
        where: {
          id: req.params.productId,
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
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "상품 조회 성공",
        data: product,
      });
    });

    it("should throw 404 error when there is no product", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      try {
        await getProductById(req, res);
      } catch (error) {
        expect(prisma.product.findUnique).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(HttpException);
        expect(error.status).toBe(404);
        expect(error.message).toBe("상품 정보가 없습니다.");
      }
    });
  });

  describe("updateorderById", () => {
    beforeEach(() => {
      req.params = {
        productId: "productId",
      };
      req.body = {
        title: "title",
        description: "description",
        price: 3,
        categoryId: "categoryId",
        stock: 3,
      };
    });
    it("should update product successfully", async () => {
      const { title, description, price, categoryId, stock } = req.body;
      await updateProductById(req, res);

      expect(prisma.product.update).toBeCalledTimes(1);
      expect(prisma.product.update).toBeCalledWith({
        where: {
          id: req.params.productId,
        },
        data: {
          title,
          slug: title ? "slug" : undefined,
          description,
          price,
          categoryId,
          stock,
        },
      });
      expect(createSlug).toBeCalledTimes(1);
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.product.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await updateProductById(req, res);
      } catch (error) {
        expect(prisma.product.update).toBeCalledTimes(1);
        expect(createSlug).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });

    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await updateProductById(req, res);
      } catch (error) {
        expect(prisma.product.update).toBeCalledTimes(0);
        expect(createSlug).toBeCalledTimes(0);
        expect(error.message).toBe("수정 데이터를 1개 이상 입력해주세요");
        expect(error.status).toBe(400);
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("deleteorderById", () => {
    beforeEach(() => {
      req.params = {
        productId: "productId",
      };
    });
    it("should delete category successfully", async () => {
      await deleteProductById(req, res);

      expect(prisma.product.delete).toBeCalledTimes(1);
      expect(prisma.product.delete).toBeCalledWith({
        where: {
          id: req.params.productId,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.product.delete.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await deleteProductById(req, res);
      } catch (error) {
        expect(prisma.product.delete).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });

  describe("uploadGalleryImage", () => {
    beforeEach(() => {
      req.params = {
        productId: "productId",
      };
      req.file = {
        key: "key1",
        location: "location1",
      };
    });
    it("should upload(create) gallery images", async () => {
      await uploadGalleryImage(req, res);

      expect(prisma.image.create).toBeCalledTimes(1);
      expect(prisma.image.create).toBeCalledWith({
        data: {
          imageName: req.file.key.split("/").pop(),
          imagePath: req.file.location,
          productId: req.params.productId,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });
  });

  describe("deleteGalleryImages", () => {
    const s3Mock = mockClient(S3Client);
    beforeEach(() => {
      req.params = {
        productId: "productId",
        imageName: "imageName",
      };
      s3Mock.reset();
    });

    it("should delete gallery images", async () => {
      await deleteGalleryImages(req, res);

      expect(prisma.image.delete).toBeCalledTimes(1);
      expect(prisma.image.delete).toBeCalledWith({
        where: {
          imageName: req.params.imageName,
          productId: req.params.productId,
        },
      });
      expect(s3Mock).toHaveReceivedCommandWith(DeleteObjectCommand, {
        Bucket: BUCKET_NAME,
        Key: `product-images/${req.params.imageName}`,
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.image.delete.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await deleteGalleryImages(req, res);
      } catch (error) {
        expect(prisma.image.delete).toBeCalledTimes(1);
        expect(prisma.image.delete).toBeCalledWith({
          where: {
            imageName: req.params.imageName,
            productId: req.params.productId,
          },
        });
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });
});
