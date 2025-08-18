import {
  getFileUploadServices,
  FileUploadService,
} from "../../modules/file-upload/file-upload.service";
import { EmailOptions } from "../../modules/email/email.service";
import authService, { AuthService } from "../../modules/auth/auth.service";
import emailService, { EmailService } from "../../modules/email/email.service";
import {
  BaseService,
  getBaseServices,
  ServiceContext,
} from "../../modules/base/base.service";

/**
 * Authentication service.
 */
export { authService, AuthService };

/**
 * Base service.
 */
export { BaseService, getBaseServices, ServiceContext };

/**
 * Email service.
 */
export { emailService, EmailService, EmailOptions };

/**
 * File upload services.
 */
export { getFileUploadServices, FileUploadService };
