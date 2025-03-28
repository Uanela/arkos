import { Prisma } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";

export type PrismaOperations = "findMany";

export type PrismaQueryOptions<T> = {
  queryOptions?: Omit<
    Prisma.Args<T, "findMany">,
    "where" | "cursor" | "take" | "skip" | "orderBy"
  >;
  findOne?: Partial<Partial<Prisma.Args<T, "findUnique">>>;
  findMany?: Partial<Prisma.Args<T, "findMany">>;
  deleteMany?: Partial<Prisma.Args<T, "deleteMany">>;
  updateMany?: Partial<Prisma.Args<T, "updateMany">>;
  createMany?: Partial<Prisma.Args<T, "createMany">>;
  createOne?: Partial<Prisma.Args<T, "create">>;
  updateOne?: Partial<Prisma.Args<T, "update">>;
  deleteOne?: Partial<Prisma.Args<T, "delete">>;
};

export interface UserRole {
  id: string;
  createdAt: Date;
  deletedAt?: Date;
  roleId: string;
  role: AuthRole;
  user: User;
  userId: string;
  attributedBy?: User;
  attributedById?: string;
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
  firstName: string;
  lastName: string;
  username: string;
  isStaff: boolean;
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  isVerified: boolean;
  deletedSelfAccount: boolean;
  active: boolean;
  roles: UserRole[];
}

export interface ArkosRequest extends Request {
  user?: User & Record<string, any>;
  relationFields?: Record<string, boolean>;
  include?: Record<string, any>;
  responseData?: Record<string, any> | null | undefined;
  additionalData?: Record<string, any> | null | undefined;
  responseStatus?: number | string | null | undefined;
}

export interface ArkosResponse extends Response {}
export interface ArkosNextFunction extends NextFunction {}
export interface ArkosRequestHandler extends RequestHandler {}
