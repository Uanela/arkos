import {
  getFileUploadServices,
  FileUploadService,
} from "../../modules/file-upload/file-upload.service";
import { EmailOptions } from "../../modules/email/email.service";
import authService, { AuthService } from "../../modules/auth/auth.service";
import emailService, { EmailService } from "../../modules/email/email.service";
import { ArkosPrismaService } from "../../modules/base/base.service";
import authActionService from "../../modules/auth/utils/services/auth-action.service";
import { ServiceHookContext } from "../../modules/base/types/base.service.types";

/**
 * Authentication service.
 */
export { authService, AuthService, authActionService };

/**
 * Base service.
 */
export {
  ArkosPrismaService,
  ServiceHookContext,
};

/**
 * Email service.
 */
export { emailService, EmailService, EmailOptions };

/**
 * File upload services.
 */
export { getFileUploadServices, FileUploadService };
