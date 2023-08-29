import express from "express";
import {
  createOrderByProductId,
  createOrderOnCart,
  deleteOrder,
  getOrderDetail,
  getOrderList,
  paymentSuccess,
} from "../controllers/order.controller.js";
import catchAsync from "../libs/catch-async.js";
import {
  checkEmailVerified,
  checkUserByOrderId,
  isLoggedIn,
} from "../middlewares/auth.guard.js";

const orderRouter = express.Router();

orderRouter.use(isLoggedIn, checkEmailVerified);

orderRouter.get("/", catchAsync(getOrderList));

orderRouter.post("/cart", catchAsync(createOrderOnCart));

orderRouter
  .route("/:orderId")
  .get(checkUserByOrderId, catchAsync(getOrderDetail))
  .delete(checkUserByOrderId, catchAsync(deleteOrder));

orderRouter.post("/product/:productId", catchAsync(createOrderByProductId));
orderRouter.get(
  "/:orderId/success",
  checkUserByOrderId,
  catchAsync(paymentSuccess)
);

export default orderRouter;
