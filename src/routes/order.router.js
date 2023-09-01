import express from "express";
import {
  deleteOrder,
  getAllOrders,
  getOrderDetail,
  getOrdersByProductId,
  getOrdersByUserId,
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

orderRouter.route("/").get(isAdmin, catchAsync(getAllOrders));

orderRouter.get("/users/:userId", catchAsync(getOrdersByUserId));

orderRouter
  .route("/:orderId")
  .get(checkUserByOrderIdOrAdmin, catchAsync(getOrderDetail))
  .delete(checkUserByOrderIdOrAdmin, catchAsync(deleteOrder));

orderRouter.route("/products/:productId").get(catchAsync(getOrdersByProductId));

export default orderRouter;
