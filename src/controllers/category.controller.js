import { prisma } from "../app.js";
import HttpException from "../libs/http-exception.js";
import { createSlug } from "../libs/utils.js";
import { CreateCategoryValidator } from "../libs/validators/category.validator.js";

export const getAllCategories = async (req, res, next) => {
  const categories = await prisma.category.findMany();

  return res.status(200).json({
    ok: true,
    msg: "전체 카테고리 조회 성공.",
    data: categories,
  });
};

export const createCategory = async (req, res, next) => {
  const { title } = CreateCategoryValidator.parse(req.body);
  const slug = createSlug(title);

  const exCategory = await prisma.category.findFirst({
    where: {
      slug,
    },
  });

  if (exCategory) throw new HttpException("이미 존재하는 카테고리입니다.", 400);

  await prisma.category.create({
    data: {
      title,
      slug,
    },
  });

  return res.status(201).end();
};

export const deleteCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;
  await prisma.category.delete({
    where: {
      id: +categoryId,
    },
  });

  return res.status(204).end();
};
