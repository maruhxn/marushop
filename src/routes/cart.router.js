import express from "express";
import {
  addProductToCart,
  deleteCartItem,
  getAllCartItems,
  updateCartItem,
} from "../controllers/cart.controller.js";
import catchAsync from "../libs/catch-async.js";
import { checkEmailVerified, isLoggedIn } from "../middlewares/auth.guard.js";

const cartRouter = express.Router();
cartRouter.use(isLoggedIn, checkEmailVerified);

cartRouter.get("/", catchAsync(getAllCartItems));

cartRouter
  .route("/:productId")
  .post(catchAsync(addProductToCart))
  .patch(catchAsync(updateCartItem))
  .delete(catchAsync(deleteCartItem));

export default cartRouter;
