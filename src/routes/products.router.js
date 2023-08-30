import express from "express";
import {
  createProduct,
  deleteGalleryImages,
  deleteProductById,
  getAllProducts,
  getProductById,
  updateProductById,
  uploadGalleryImages,
} from "../controllers/products.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isAdmin } from "../middlewares/auth.guard.js";

const productsRouter = express.Router();

productsRouter
  .route("/")
  .get(catchAsync(getAllProducts))
  .post(isAdmin, catchAsync(createProduct));

productsRouter
  .route("/:productId")
  .get(catchAsync(getProductById))
  .patch(isAdmin, catchAsync(updateProductById))
  .delete(isAdmin, catchAsync(deleteProductById));

productsRouter.post(
  "/:productId/images",
  isAdmin,
  catchAsync(uploadGalleryImages)
);

productsRouter.delete(
  "/:productId/images/:imageName",
  isAdmin,
  catchAsync(deleteGalleryImages)
);
export default productsRouter;
