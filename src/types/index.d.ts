import { JwtPayload } from 'jsonwebtoken'
import { Prisma } from '@prisma/client'

export {}

declare global {
  namespace Express {
    interface Request {
      user?: User & Record<string, any>
      relationFields?: Record<string, boolean>
      include?: Record<string, any>
      responseData?: Record<string, any>
      responseStatus?: number
    }
  }
}

/**
 * Possible actions that can be performed by a controller.
 */
export type ControllerActions = 'create' | 'update' | 'delete' | 'view'

/**
 * Rules defining access control for different controller actions.
 *
 * @typeParam key - One of the `ControllerActions`.
 * @typeParam Role - A type representing a role or set of roles allowed to perform the action.
 */
export type AccessControlRules = {
  /**
   * Maps each `ControllerAction` to the roles allowed to perform it.
   */
  [key in ControllerActions]: any | any[]
}

/**
 * Rules defining access control for different controller actions.
 *
 * @typeParam key - One of the `ControllerActions`.
 * @typeParam Role - A type representing a role or set of roles allowed to perform the action.
 */
export type AuthenticationControlRules = {
  /**
   * Maps each `ControllerAction` to the actions that requires authentication to perform it.
   */
  [key in ControllerActions]: boolean
}

/**
 * Configuration for authentication and access control.
 */
export type AuthConfigs = {
  /**
   * Defines access control rules for roles or actions.
   *
   * @type {Role | Role[] | AccessControlRules}
   */
  authenticationControl?: boolean | Partial<AuthenticationControlRules>
  accessControl?: any | any[] | Partial<AccessControlRules>
}

/**
 * Payload structure for JWT-based authentication, extending the standard `JwtPayload`.
 */
export interface AuthJwtPayload extends JwtPayload {
  /**
   * The unique identifier of the authenticated user.
   *
   * @type {number | string}
   */
  id?: number | string

  /**
   * The email address of the authenticated user.
   *
   * @type {string}
   */
  email?: string
}

export type PrismaOperations = 'findMany'

export type PrismaQueryOptions<T> = {
  queryOptions?: Omit<
    Prisma.Args<T, 'findMany'>,
    'where' | 'cursor' | 'take' | 'skip' | 'orderBy'
  >
  findOne?: Partial<Partial<Prisma.Args<T, 'findUnique'>>>
  findMany?: Partial<Prisma.Args<T, 'findMany'>>
  deleteMany?: Partial<Prisma.Args<T, 'deleteMany'>>
  updateMany?: Partial<Prisma.Args<T, 'updateMany'>>
  createMany?: Partial<Prisma.Args<T, 'createMany'>>
  createOne?: Partial<Prisma.Args<T, 'create'>>
  updateOne?: Partial<Prisma.Args<T, 'update'>>
  deleteOne?: Partial<Prisma.Args<T, 'delete'>>
}

export interface UserRole {
  id: string
  createdAt: Date
  deletedAt?: Date
  roleId: string
  role: AuthRole
  user: User
  userId: string
  attributedBy?: StaffProfile
  attributedById?: string
}

export interface AuthRole {
  id: string
  createdAt: Date
  deletedAt?: Date
  name: string
  permissions: AuthPermission[]
  userRoles: UserRole[]
}

export enum AuthPermissionAction {
  create = 'create',
  view = 'view',
  update = 'update',
  delete = 'delete',
}

export interface AuthPermission {
  id: string
  createdAt: Date
  deletedAt?: Date
  resource: string
  action: AuthPermissionAction
  roleId: string
  role: AuthRole
}

export interface User {
  id: string
  name: string
  email: string
  isStaff: boolean
  password: string
  passwordChangedAt?: Date
  passwordResetOtp?: string
  passwordResetOtpExpiresAt?: Date
  verificationOtp?: string
  verificationOptExpiresAt?: Date
  isVerified: boolean
  deletedSelfAccount: boolean
  active: boolean
  publicProfile?: PublicProfile
  staffProfile?: StaffProfile
  roles: UserRole[]
}

export interface StaffProfile {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  userId: string
  user: User
}

export interface PublicProfile {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  userId: string
  user: User
}
