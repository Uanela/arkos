import { initApp } from "./server";
import authService from "./modules/auth/auth.service";
import emailService, {
  EmailService,
  EmailOptions,
} from "./modules/email/email.service";
import catchAsync from "./modules/error-handler/utils/catch-async";
import AppError from "./modules/error-handler/utils/app-error";
import {
  imageUploaderService,
  documentUploaderService,
  videoUploaderService,
  fileUploaderService,
} from "./modules/file-uploader/file-uploader.service";
import { capitalize } from "./utils/helpers/text.helpers";
import validateDto from "./utils/validate-dto";
import { BaseService } from "./modules/base/base.service";

const arkos = {
  init: initApp,
};

export const services = {
  auth: authService,
  base: BaseService,
  email: emailService,
  EmailServiceClass: EmailService,
  fileUploader: {
    image: imageUploaderService,
    document: documentUploaderService,
    video: videoUploaderService,
    file: fileUploaderService,
  },
};

export const errorHandler = {
  catchAsync,
  AppError,
};

export const utils = {
  capitalize,
};

export const validation = {
  validateDto,
};

export { EmailOptions };
export default arkos;
