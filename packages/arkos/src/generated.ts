/**
 * @maintainers THIS FILE IS A STUB — DO NOT PUT REAL LOGIC HERE.
 *
 * This file exists only so the Arkos source compiles during development.
 * It is completely overwritten at build time by `scripts/generate-post-build-types.ts`,
 * which replaces it with re-exports from `@arkosjs/types` — a folder generated
 * in the user's `node_modules` by `npx arkos prisma generate`.
 *
 * This is the single gateway for all Prisma-dependent types and values.
 * DO NOT import from `@prisma/client` or any user-project-specific module
 * anywhere else in the codebase — add it here instead.
 *
 * To add a new generated type or value:
 *   1. Add a stub export here
 *   2. Add the real export to the `npx arkos prisma generate` output in
 *      `src/utils/cli/commands/prisma-generate.command.ts`
 *   3. Add it to the overwrite in `scripts/generate-post-build-types.ts`
 */

/**
 * A map of all Prisma models in the user's project.
 * Each key is a kebab-case model name, each value contains the full
 * Prisma delegate, payload, and args types for that model.
 *
 * Stub during Arkos development — replaced with real generated types
 * after `npx arkos prisma generate`.
 *
 * @example
 * ```ts
 * class BaseService<TModelName extends keyof PrismaModels<any>> {}
 * ```
 */

interface StubWhereArgs {
  where?: { id?: any; [key: string]: any };
  [key: string]: any;
}

interface StubWhereUniqueArgs {
  where: { id?: any; [key: string]: any };
  [key: string]: any;
}

interface StubDataArgs {
  data: Record<string, any>;
  [key: string]: any;
}

interface StubWhereDataArgs {
  where: { id?: any; [key: string]: any };
  data: Record<string, any>;
  [key: string]: any;
}

interface StubPaginationArgs extends StubWhereArgs {
  orderBy?: Record<string, any>;
  select?: Record<string, any>;
  include?: Record<string, any>;
  skip?: number;
  take?: number;
  cursor?: Record<string, any>;
}

interface StubCountArgs extends StubWhereArgs {
  select?: Record<string, any>;
  orderBy?: Record<string, any>;
  skip?: number;
  take?: number;
  cursor?: Record<string, any>;
}

/**
 * Extracts the `where` filter type from a Prisma args type.
 * @example ExtractPrismaFilters<PrismaModels<any>['user']['FindManyArgs']>
 */
export type ExtractPrismaFilters<T> = T extends {
  where?: infer W;
  [key: string]: any;
}
  ? W
  : any;

/**
 * Extracts the `data` type from a Prisma args type.
 * @example ExtractPrismaData<PrismaModels<any>['user']['CreateArgs']>
 */
export type ExtractPrismaData<T> = T extends {
  data: infer D;
  [key: string]: any;
}
  ? D
  : any;

/**
 * Extracts query options from a Prisma args type by omitting the specified keys.
 * @example ExtractPrismaQueryOptions<PrismaModels<any>['user']['CreateArgs'], 'data'>
 */
export type ExtractPrismaQueryOptions<T, K extends keyof T = never> = Omit<
  T,
  K
>;

/**
 * A map of all Prisma models in the user's project.
 * Each key is a kebab-case model name, each value contains the full
 * Prisma delegate, payload, and args types for that model.
 *
 * Stub during Arkos development — replaced with real generated types
 * after `npx arkos prisma generate`.
 *
 * @example
 * ```ts
 * class BaseService<TModelName extends keyof PrismaModels<any>> {}
 * ```
 */
export type PrismaModels<T extends Record<string, any>> = Record<
  string,
  {
    Delegate: Record<string, (...args: any[]) => any>;
    GetPayload: Record<string, any>;
    FindManyArgs: StubPaginationArgs;
    FindFirstArgs: StubPaginationArgs;
    CreateArgs: StubDataArgs;
    CreateManyArgs: StubDataArgs;
    UpdateArgs: StubWhereDataArgs;
    UpdateManyArgs: StubWhereDataArgs;
    DeleteArgs: StubWhereUniqueArgs;
    DeleteManyArgs: StubWhereArgs;
    CountArgs: StubCountArgs;
  }
>;

/**
 * Stub PrismaClient for Arkos development.
 * Replaced with the real `PrismaClient` from `@prisma/client` after
 * `npx arkos prisma generate`.
 */
export class PrismaClient {
  [key: string]: any;
}
