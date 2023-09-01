import express from "express";
import {
  addProductToCart,
  addSelectedItemsToSession,
  deleteCartItem,
  getAllCartItems,
  updateCartItem,
} from "../controllers/cart.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isEmailVerified, isLoggedIn } from "../middlewares/auth.guard.js";

const cartRouter = express.Router();
cartRouter.use(isLoggedIn, isEmailVerified);

cartRouter.get("/", catchAsync(getAllCartItems));

cartRouter.post("/select", catchAsync(addSelectedItemsToSession));

cartRouter
  .route("/:productId")
  .post(catchAsync(addProductToCart))
  .patch(catchAsync(updateCartItem))
  .delete(catchAsync(deleteCartItem));

export default cartRouter;
