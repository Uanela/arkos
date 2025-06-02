import { NextFunction, Request, RequestHandler, Response } from "express";

export type PrismaOperations = "findMany";

export type PrismaQueryOptions<T extends Record<string, any>> = {
  queryOptions?: Partial<Parameters<T["findMany"]>[0]>;
  findOne?: Partial<Parameters<T["findFirst"]>[0]>;
  findMany?: Partial<Parameters<T["findMany"]>[0]>;
  deleteMany?: Partial<Parameters<T["deleteMany"]>[0]>;
  updateMany?: Partial<Parameters<T["updateMany"]>[0]>;
  createMany?: Partial<Parameters<T["createMany"]>[0]>;
  createOne?: Partial<Parameters<T["create"]>[0]>;
  updateOne?: Partial<Parameters<T["update"]>[0]>;
  deleteOne?: Partial<Parameters<T["delete"]>[0]>;
};

export type AuthPrismaQueryOptions<T extends Record<string, any>> = {
  // User profile endpoints
  getMe?: Partial<Parameters<T["findUnique"]>[0]>;
  updateMe?: Partial<Parameters<T["update"]>[0]>;
  deleteMe?: Partial<Parameters<T["update"]>[0]>;

  // Authentication endpoints
  login?: Partial<Parameters<T["findFirst"]>[0]>;
  signup?: Partial<Parameters<T["create"]>[0]>;
  updatePassword?: Partial<Parameters<T["update"]>[0]>;
};

/**
 * Interface defining the minimum structure required for Prisma model delegates
 * This allows us to constraint TModel without requiring Prisma imports
 */
export type PrismaModelDelegate = a;

type a = {
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
}

export interface ArkosResponse extends Response {}
export interface ArkosNextFunction extends NextFunction {}
export interface ArkosRequestHandler extends RequestHandler {}
