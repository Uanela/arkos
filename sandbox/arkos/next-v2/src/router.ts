import { ArkosRouter } from "arkos";
import fileUploadRouter from "@/src/modules/file-upload/file-upload.router";
import authRouter from "@/src/modules/auth/auth.router";
import userRouter from "@/src/modules/user/user.router";

const router = ArkosRouter();

router.use(fileUploadRouter);
router.use(userRouter);
router.use(authRouter);

export default router;
