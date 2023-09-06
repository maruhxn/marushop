import httpMocks from "node-mocks-http";
import prisma from "../../../src/configs/prisma-client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  createCategory,
  deleteCategoryById,
  getAllCategories,
  updateCategoryById,
} from "../../../src/controllers/category.controller";
import { createSlug } from "../../../src/libs/utils";

jest.mock("../../../src/configs/prisma-client", () => ({
  category: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../src/libs/utils", () => ({
  createSlug: jest.fn(),
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

describe("Category Controller", () => {
  describe("getAllCategories", () => {
    it("should return All categories", async () => {
      const categories = [{}, {}, {}];

      prisma.category.findMany.mockResolvedValue(categories);

      await getAllCategories(req, res);

      expect(prisma.category.findMany).toBeCalledTimes(1);
      expect(prisma.category.findMany).toBeCalledWith();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toStrictEqual({
        ok: true,
        msg: "전체 카테고리 조회 성공.",
        data: categories,
      });
    });
  });

  describe("createCategory", () => {
    beforeAll(() => {
      createSlug.mockReturnValue("slug");
    });

    it("should create new category successfully", async () => {
      req.body = {
        title: "New Category Title",
      };

      await createCategory(req, res);

      expect(prisma.category.create).toBeCalledTimes(1);
      expect(prisma.category.create).toBeCalledWith({
        data: {
          title: req.body.title,
          slug: "slug",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res._isEndCalled()).toBeTruthy();
    });
    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await createCategory(req, res);
      } catch (error) {
        expect(prisma.category.update).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });

    it("should throw 409 error when there is exCategory", async () => {
      req.body = {
        title: "Existing Title",
      };
      const errorCode = "P2002";

      prisma.category.create.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청값에 해당하는 데이터가 이미 존재합니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await createCategory(req, res);
      } catch (error) {
        expect(prisma.category.create).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });

  describe("updateCategoryById", () => {
    beforeAll(() => {
      createSlug.mockReturnValue("slug");
    });

    beforeEach(() => {
      req.params = {
        categoryId: "productId",
      };
      req.body = {
        title: "Upated Title",
      };
    });
    it("should update category's title successfully", async () => {
      await updateCategoryById(req, res);

      expect(prisma.category.update).toBeCalledTimes(1);
      expect(prisma.category.update).toBeCalledWith({
        where: {
          id: req.params.categoryId,
        },
        data: {
          title: req.body.title,
          slug: "slug",
        },
      });
      expect(createSlug).toBeCalledTimes(1);
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.category.update.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await updateCategoryById(req, res);
      } catch (error) {
        expect(prisma.category.update).toBeCalledTimes(1);
        expect(createSlug).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });

    it("should throw 400 error when receive invalid body", async () => {
      req.body = {};

      try {
        await updateCategoryById(req, res);
      } catch (error) {
        expect(prisma.category.update).toBeCalledTimes(0);
        expect(createSlug).toBeCalledTimes(0);
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe("deleteCategoryById", () => {
    beforeEach(() => {
      req.params = {
        categoryId: "productId",
      };
    });
    it("should delete category successfully", async () => {
      await deleteCategoryById(req, res);

      expect(prisma.category.delete).toBeCalledTimes(1);
      expect(prisma.category.delete).toBeCalledWith({
        where: {
          id: req.params.categoryId,
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res._isEndCalled()).toBeTruthy();
    });

    it("should throw 404 error when there is no product", async () => {
      const errorCode = "P2025";

      prisma.category.delete.mockImplementation(() => {
        throw new Prisma.PrismaClientKnownRequestError(
          "요청하신 레코드를 찾을 수 없습니다.",
          {
            code: errorCode,
          }
        );
      });

      try {
        await deleteCategoryById(req, res);
      } catch (error) {
        expect(prisma.category.delete).toBeCalledTimes(1);
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe(errorCode);
      }
    });
  });
});
