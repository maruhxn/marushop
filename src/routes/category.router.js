import express from "express";
import {
  createCategory,
  deleteCategoryById,
  getAllCategories,
  updateCategoryById,
} from "../controllers/category.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isAdmin } from "../middlewares/auth.guard.js";

const categoryRouter = express.Router();

categoryRouter
  .route("/")
  .get(catchAsync(getAllCategories))
  .post(isAdmin, catchAsync(createCategory));

categoryRouter
  .route("/:categoryId")
  .put(isAdmin, catchAsync(updateCategoryById))
  .delete(isAdmin, catchAsync(deleteCategoryById));
export default categoryRouter;
