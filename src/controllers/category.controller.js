import prisma from "../configs/prisma-client.js";
import { createSlug } from "../libs/utils.js";
import { CreateCategoryValidator } from "../libs/validators/category.validator.js";

export const getAllCategories = async (req, res) => {
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

  await prisma.category.create({
    data: {
      title,
      slug,
    },
  });

  return res.status(201).end();
};

export const updateCategoryById = async (req, res) => {
  const { categoryId } = req.params;
  const { title } = CreateCategoryValidator.parse(req.body);
  const slug = createSlug(title);

  await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      title,
      slug,
    },
  });

  res.send(204).end();
};

export const deleteCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;

  await prisma.category.delete({
    where: {
      id: categoryId,
    },
  });

  return res.status(204).end();
};
