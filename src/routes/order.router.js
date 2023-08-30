import express from "express";
import {
  createOrderByProductId,
  createOrderOnCart,
  deleteOrder,
  getAllOrders,
  getOrderDetail,
  getOrdersByProductId,
  getOrdersByUserId,
  paymentSuccess,
} from "../controllers/order.controller.js";
import catchAsync from "../libs/catch-async.js";
import {
  checkUserByOrderIdOrAdmin,
  isAdmin,
  isEmailVerified,
  isLoggedIn,
} from "../middlewares/auth.guard.js";

const orderRouter = express.Router();

orderRouter.use(isLoggedIn, isEmailVerified);

orderRouter.get("/", isAdmin, catchAsync(getAllOrders));

orderRouter.post("/cart", catchAsync(createOrderOnCart));

orderRouter.get("/users/:userId", catchAsync(getOrdersByUserId));

orderRouter
  .route("/:orderId")
  .get(checkUserByOrderIdOrAdmin, catchAsync(getOrderDetail))
  .delete(checkUserByOrderIdOrAdmin, catchAsync(deleteOrder));

orderRouter
  .route("/products/:productId")
  .get(catchAsync(getOrdersByProductId))
  .post(catchAsync(createOrderByProductId));

orderRouter.patch(
  "/:orderId/success",
  checkUserByOrderIdOrAdmin,
  catchAsync(paymentSuccess)
);

export default orderRouter;
