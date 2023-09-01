import express from "express";
import {
  paymentsCancel,
  paymentsCancelForce,
  paymentsComplete,
  paymentsPrepare,
} from "../controllers/payments.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isEmailVerified, isLoggedIn } from "../middlewares/auth.guard.js";

const paymentsRouter = express.Router();

paymentsRouter.use(isLoggedIn, isEmailVerified);

paymentsRouter.post("/prepare", catchAsync(paymentsPrepare));
paymentsRouter.post("/complete", catchAsync(paymentsComplete));
paymentsRouter.post("/cancel", catchAsync(paymentsCancel));
paymentsRouter.post("/force-cancel", catchAsync(paymentsCancelForce));

export default paymentsRouter;
