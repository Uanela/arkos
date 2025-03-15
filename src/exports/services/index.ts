import { EmailOptions } from "../../modules/email/email.service";
import authService from "../../modules/auth/auth.service";
import emailService, { EmailService } from "../../modules/email/email.service";
import {
  imageUploaderService,
  documentUploaderService,
  videoUploaderService,
  fileUploaderService,
} from "../../modules/file-uploader/file-uploader.service";
import { BaseService, getBaseServices } from "../../modules/base/base.service";

/**
 * Authentication service.
 */
export { authService };

/**
 * Base service.
 */
export { BaseService, getBaseServices };

/**
 * Email service.
 */
export { emailService, EmailService, EmailOptions };

/**
 * File upload services.
 */
export {
  imageUploaderService,
  documentUploaderService,
  videoUploaderService,
  fileUploaderService,
};
