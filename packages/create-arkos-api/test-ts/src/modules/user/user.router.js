import { Router } from "express";
import { authService } from "arkos/services";
import userController from "./user.controller";

const userRouter = Router();

userRouter.get(
  "/custom-endpoint/a", // resolves to /api/users/custom-endpoint
  // authService.authenticate,
  // authService.handleAccessControl("CustomAction", "user"),
  userController.findMany
);

export default userRouter;
