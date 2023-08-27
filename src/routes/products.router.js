import express from "express";
import { getAllProducts } from "../controllers/products.controller.js";
import catchAsync from "../libs/catch-async.js";

const productsRouter = express.Router();

productsRouter.get("/", catchAsync(getAllProducts));

export default productsRouter;
