// This will be modified with a post build script scripts/generate-post-build-static-types.
import { Request } from "express";

export interface User extends Record<string, any> {
  id: string;
  isSuperUser: boolean;
  password: string;
  passwordChangedAt?: Date;
  deletedSelfAccountAt: Date;
  isActive: boolean;
}

export interface ArkosRequest<
  P extends Record<string, any> = any,
  ResBody = any,
  ReqBody = any,
  Query extends Record<string, any> = any,
> extends Request<P, ResBody, ReqBody, Query> {
  /**
   * Authenticated user with additional fields
   */
  user?: User;

  /**
   * Fields to include in relational queries
   */
  relationFields?: Record<string, boolean>;

  /**
   * Prisma include options for related data
   */
  include?: Record<string, any>;

  /**
   * Data to be sent in the response
   */
  responseData?: Record<string, any> | null;

  /**
   * Additional context data
   */
  additionalData?: Record<string, any> | null;

  /**
   * HTTP status code for the response
   */
  responseStatus?: number;

  /**
   * Typed request body
   */
  body: ReqBody;

  /**
   * Prisma query options (where, orderBy, select, etc.)
   */
  prismaQueryOptions?: Record<string, any>;

  /**
   * Typed query parameters
   */
  query: Query;

  /**
   * JWT token used in authentication process
   */
  accessToken?: string;

  /**
   * Query parameters after being handled and transformed by middleware
   */
  transformedQuery?: Record<string, any>;

  /**
   * Processed filters from APIFeatures.filters
   */
  filters?: Record<string, any>;

  /**
   * Name of the Prisma model being queried
   */
  modelName?: string;
}
