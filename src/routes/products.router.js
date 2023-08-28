import express from "express";
import {
  createProduct,
  deleteGalleryImages,
  deleteProductById,
  getAllProducts,
  getProductById,
  uploadGalleryImages,
} from "../controllers/products.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isAdmin } from "../middlewares/auth.guard.js";

const productsRouter = express.Router();

productsRouter
  .route("/")
  .get(catchAsync(getAllProducts))
  .post(isAdmin, catchAsync(createProduct));

productsRouter.post(
  "/product-gallery/:productId",
  isAdmin,
  catchAsync(uploadGalleryImages)
);

productsRouter
  .route("/:productId")
  .get(catchAsync(getProductById))
  .delete(isAdmin, catchAsync(deleteProductById));

productsRouter.delete(
  "/:productId/images/:imageName",
  isAdmin,
  catchAsync(deleteGalleryImages)
);
export default productsRouter;
