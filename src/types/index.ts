import { NextFunction, Request, RequestHandler, Response } from "express";

export type PrismaOperations = "findMany";

export type PrismaQueryOptions<T extends Record<string, any>> = {
  queryOptions?: Omit<
    Parameters<T["findMany"]>[0],
    "where" | "cursor" | "take" | "skip" | "orderBy"
  >;
  findOne?: Partial<Parameters<T["findFirst"]>[0]>;
  findMany?: Partial<Parameters<T["findMany"]>[0]>;
  deleteMany?: Partial<Parameters<T["deleteMany"]>[0]>;
  updateMany?: Partial<Parameters<T["updateMany"]>[0]>;
  createMany?: Partial<Parameters<T["createMany"]>[0]>;
  createOne?: Partial<Parameters<T["create"]>[0]>;
  updateOne?: Partial<Parameters<T["update"]>[0]>;
  deleteOne?: Partial<Parameters<T["delete"]>[0]>;
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
  create = "create",
  view = "view",
  update = "update",
  delete = "delete",
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
  // query: Query extends Request['ParsedQs'];
}

export interface ArkosResponse extends Response {}
export interface ArkosNextFunction extends NextFunction {}
export interface ArkosRequestHandler extends RequestHandler {}
