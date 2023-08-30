import express from "express";
import {
  createProduct,
  deleteGalleryImages,
  deleteProductById,
  getAllProducts,
  getProductById,
  updateProductById,
  uploadGalleryImage,
} from "../controllers/products.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isAdmin } from "../middlewares/auth.guard.js";
import upload from "../middlewares/multer.js";

const productsRouter = express.Router();

productsRouter
  .route("/")
  .get(catchAsync(getAllProducts))
  .post(isAdmin, upload.array("image"), catchAsync(createProduct));

productsRouter
  .route("/:productId")
  .get(catchAsync(getProductById))
  .patch(isAdmin, catchAsync(updateProductById))
  .delete(isAdmin, catchAsync(deleteProductById));

productsRouter.post(
  "/:productId/images",
  isAdmin,
  upload.single("image"),
  catchAsync(uploadGalleryImage)
);

productsRouter.delete(
  "/:productId/images/:imageName",
  isAdmin,
  catchAsync(deleteGalleryImages)
);
export default productsRouter;
