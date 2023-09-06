import express from "express";
import {
  deleteUserById,
  getAllUsers,
  getUserDetail,
  updateUserById,
} from "../controllers/users.controller.js";
import catchAsync from "../libs/catch-async.js";
import {
  checkUserByUserId,
  isAdmin,
  isEmailVerified,
  isLoggedIn,
} from "../middlewares/auth.guard.js";

const usersRouter = express.Router();

usersRouter.get("/", isLoggedIn, isAdmin, catchAsync(getAllUsers));

usersRouter
  .route("/:userId")
  .get(isLoggedIn, isEmailVerified, catchAsync(getUserDetail))
  .patch(
    isLoggedIn,
    isEmailVerified,
    checkUserByUserId,
    catchAsync(updateUserById)
  )
  .delete(isLoggedIn, isAdmin, catchAsync(deleteUserById));

export default usersRouter;
