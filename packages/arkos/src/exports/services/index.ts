import {
  getFileUploadServices,
  FileUploadService,
} from "../../modules/file-upload/file-upload.service";
import { EmailOptions } from "../../modules/email/email.service";
import authService, { AuthService } from "../../modules/auth/auth.service";
import emailService, { EmailService } from "../../modules/email/email.service";
import { BaseService } from "../../modules/base/base.service";
import authActionService from "../../modules/auth/utils/services/auth-action.service";
import {
  ServiceBaseContext,
  BeforeCreateOneHookArgs,
  AfterCreateOneHookArgs,
  BeforeCreateManyHookArgs,
  AfterCreateManyHookArgs,
  BeforeCountHookArgs,
  AfterCountHookArgs,
  BeforeFindManyHookArgs,
  AfterFindManyHookArgs,
  BeforeFindOneHookArgs,
  AfterFindOneHookArgs,
  BeforeUpdateOneHookArgs,
  AfterUpdateOneHookArgs,
  BeforeUpdateManyHookArgs,
  AfterUpdateManyHookArgs,
  BeforeDeleteOneHookArgs,
  AfterDeleteOneHookArgs,
  BeforeDeleteManyHookArgs,
  AfterDeleteManyHookArgs,
  OnCreateOneErrorHookArgs,
  OnCreateManyErrorHookArgs,
  OnCountErrorHookArgs,
  OnFindManyErrorHookArgs,
  OnFindByIdErrorHookArgs,
  OnFindOneErrorHookArgs,
  OnUpdateOneErrorHookArgs,
  OnUpdateManyErrorHookArgs,
  OnDeleteOneErrorHookArgs,
  OnDeleteManyErrorHookArgs,
} from "../../modules/base/types/base.service.types";

/**
 * Authentication service.
 */
export { authService, AuthService, authActionService };

/**
 * Base service.
 */
export {
  BaseService,
  ServiceBaseContext,
  BeforeCreateOneHookArgs,
  AfterCreateOneHookArgs,
  BeforeCreateManyHookArgs,
  AfterCreateManyHookArgs,
  BeforeCountHookArgs,
  AfterCountHookArgs,
  BeforeFindManyHookArgs,
  AfterFindManyHookArgs,
  BeforeFindOneHookArgs,
  AfterFindOneHookArgs,
  BeforeUpdateOneHookArgs,
  AfterUpdateOneHookArgs,
  BeforeUpdateManyHookArgs,
  AfterUpdateManyHookArgs,
  BeforeDeleteOneHookArgs,
  AfterDeleteOneHookArgs,
  BeforeDeleteManyHookArgs,
  AfterDeleteManyHookArgs,
  OnCreateOneErrorHookArgs,
  OnCreateManyErrorHookArgs,
  OnCountErrorHookArgs,
  OnFindManyErrorHookArgs,
  OnFindByIdErrorHookArgs,
  OnFindOneErrorHookArgs,
  OnUpdateOneErrorHookArgs,
  OnUpdateManyErrorHookArgs,
  OnDeleteOneErrorHookArgs,
  OnDeleteManyErrorHookArgs,
};

/**
 * Email service.
 */
export { emailService, EmailService, EmailOptions };

/**
 * File upload services.
 */
export { getFileUploadServices, FileUploadService };
