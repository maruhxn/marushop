import express from "express";
import {
  paymentsComplete,
  paymentsPrepare,
} from "../controllers/payments.controller.js";
import catchAsync from "../libs/catch-async.js";
import { isEmailVerified, isLoggedIn } from "../middlewares/auth.guard.js";

const paymentsRouter = express.Router();

paymentsRouter.use(isLoggedIn, isEmailVerified);

paymentsRouter.post("/prepare", catchAsync(paymentsPrepare));
paymentsRouter.post("/complete", catchAsync(paymentsComplete));

export default paymentsRouter;
