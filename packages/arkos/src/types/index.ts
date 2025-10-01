import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

export type PrismaOperations = "findMany";

/**
 * Type definition for authentication-related Prisma query operations
 * @template T - The Prisma model delegate type
 */
export type AuthPrismaQueryOptions<T extends Record<string, any>> = {
  // User profile endpoints
  /**
   * Options for retrieving the current authenticated user's profile
   */
  getMe?: Partial<Parameters<T["findUnique"]>[0]>;
  /**
   * Options for updating the current authenticated user's profile
   */
  updateMe?: Partial<Parameters<T["update"]>[0]>;
  /**
   * Options for soft deleting or deactivating the current authenticated user's account
   */
  deleteMe?: Partial<Parameters<T["update"]>[0]>;
  // Authentication endpoints
  /**
   * Options for user login authentication queries
   */
  login?: Partial<Parameters<T["findFirst"]>[0]>;
  /**
   * Options for user registration and account creation
   */
  signup?: Partial<Parameters<T["create"]>[0]>;
  /**
   * Options for updating the current authenticated user's password
   */
  updatePassword?: Partial<Parameters<T["update"]>[0]>;
  /**
   * Options for finding multiple auth actions
   */
  findManyAuthAction?: Partial<Parameters<T["findMany"]>[0]>;
  /**
   * Options for finding a single auth action
   */
  findOneAuthAction?: Partial<Parameters<T["findFirst"]>[0]>;
};

/**
 * Base Prisma query options for standard CRUD operations
 * @template T - The Prisma model delegate type
 */
type BasePrismaQueryOptions<T extends Record<string, any>> = {
  /**
   * @deprecated Use `global` instead for general query options
   */
  queryOptions?: Partial<Parameters<T["findMany"]>[0]>;
  /**
   * Global query options that can be used for all operations
   * Replaces the deprecated queryOptions
   */
  global?: Partial<Parameters<T["findMany"]>[0]>;
  /**
   * General find options for findMany and findOne operations
   */
  find?: Partial<Parameters<T["findMany"]>[0]>;
  /**
   * General create options for createOne and createMany operations
   */
  create?: Partial<Parameters<T["create"]>[0]>;
  /**
   * General update options for updateOne and updateMany operations
   */
  update?: Partial<Parameters<T["update"]>[0]>;
  /**
   * General delete options for deleteOne and deleteMany operations
   */
  delete?: Partial<Parameters<T["delete"]>[0]>;
  /**
   * General save options for createOne, createMany, updateOne, updateMany operations
   */
  save?:
    | Partial<Parameters<T["create"]>[0]>
    | Partial<Parameters<T["update"]>[0]>;
  /**
   * Save options for single record operations (createOne, updateOne)
   */
  saveOne?:
    | Partial<Parameters<T["create"]>[0]>
    | Partial<Parameters<T["update"]>[0]>;
  /**
   * Save options for multiple record operations (createMany, updateMany)
   */
  saveMany?:
    | Partial<Parameters<T["createMany"]>[0]>
    | Partial<Parameters<T["updateMany"]>[0]>;
  /**
   * Options for finding a single record (first match)
   */
  findOne?: Partial<Parameters<T["findFirst"]>[0]>;
  /**
   * Options for finding multiple records
   */
  findMany?: Partial<Parameters<T["findMany"]>[0]>;
  /**
   * Options for creating a single record
   */
  createOne?: Partial<Parameters<T["create"]>[0]>;
  /**
   * Options for creating multiple records
   */
  createMany?: Partial<Parameters<T["createMany"]>[0]>;
  /**
   * Options for updating a single record
   */
  updateOne?: Partial<Parameters<T["update"]>[0]>;
  /**
   * Options for updating multiple records
   */
  updateMany?: Partial<Parameters<T["updateMany"]>[0]>;
  /**
   * Options for deleting a single record
   */
  deleteOne?: Partial<Parameters<T["delete"]>[0]>;
  /**
   * Options for deleting multiple records
   */
  deleteMany?: Partial<Parameters<T["deleteMany"]>[0]>;
};

/**
 * Type definition for Prisma query operations with flexible options
 * Conditionally provides auth-specific options when ModelName is "auth"
 * @template T - The Prisma model delegate type
 * @template ModelName - The model name (defaults to string for standard models)
 */
export type PrismaQueryOptions<
  T extends Record<string, any>,
  ModelName extends string = string,
> = ModelName extends "auth"
  ? AuthPrismaQueryOptions<T>
  : BasePrismaQueryOptions<T>;
/**
 * Interface defining the minimum structure required for Prisma model delegates
 * This allows us to constraint TModel without requiring Prisma imports
 */
export type PrismaModelDelegate = {
  create: (args: { data: never; [key: string]: never }) => Promise<any>;
  createMany: (args: { data: never; [key: string]: never }) => Promise<any>;
  findMany: (args: { [key: string]: never }) => Promise<any[]>;
  findFirst: (args: { where: never; [key: string]: never }) => Promise<any>;
  findUnique: (args: { where: never; [key: string]: never }) => Promise<any>;
  update: (args: {
    where: never;
    data: never;
    [key: string]: never;
  }) => Promise<any>;
  updateMany: (args: {
    where: never;
    data: never;
    [key: string]: never;
  }) => Promise<any>;
  delete: (args: { where: never; [key: string]: never }) => Promise<any>;
  deleteMany: (args: { where: never; [key: string]: never }) => Promise<any>;
  count: (args: { where: never; [key: string]: never }) => Promise<number>;
};

export interface UserRole {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  roleId: string;
  role: AuthRole;
  user: User;
  userId: string;
}

export interface AuthRole {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  name: string;
  permissions: AuthPermission[];
  userRoles: UserRole[];
}

export enum AuthPermissionAction {
  Create = "Create",
  View = "View",
  Update = "Update",
  Delete = "Delete",
}

export interface AuthPermission {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  resource: string;
  action: AuthPermissionAction;
  roleId: string;
  role: AuthRole;
}

export interface User {
  id: string;
  isStaff: boolean;
  isSuperUser: boolean;
  password: string;
  passwordChangedAt?: Date;
  deletedSelfAccountAt: Date;
  isActive: boolean;
  roles?: UserRole[] | any[];
  role?: UserRole | any;
}

export interface ArkosRequest<Body = any, Query = any> extends Request {
  user?: User & Record<string, any>;
  relationFields?: Record<string, boolean>;
  include?: Record<string, any>;
  responseData?: Record<string, any> | null | undefined;
  additionalData?: Record<string, any> | null | undefined;
  responseStatus?: number | string | null | undefined;
  body: Body;
  prismaQueryOptions?: Record<string, any>;
  // query: Query extends Request['ParsedQs'];
  accessToken?: string;
  /**
   * This represents `req.query` after being handled and transformed.
   */
  transformedQuery?: Record<string, any>;
  /**
   * Return result of APIFeatures.filters
   */
  filters?: Record<string, any>;
  modelName?: string;
}

export interface ArkosResponse extends Response {}
export interface ArkosNextFunction extends NextFunction {}
export interface ArkosRequestHandler extends RequestHandler {}
export interface ArkosErrorRequestHandler extends ErrorRequestHandler {}
