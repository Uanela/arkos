import {
  getFileUploaderServices,
  FileUploaderService,
} from "./../../modules/file-upload/file-upload.service";
import { EmailOptions } from "../../modules/email/email.service";
import authService from "../../modules/auth/auth.service";
import emailService, { EmailService } from "../../modules/email/email.service";
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
export { getFileUploaderServices, FileUploaderService };
