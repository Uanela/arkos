import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../sheu";
import path from "path";

export default function prismaGenerateCommand() {
  const content = `
import { ServiceBaseContext } from "arkos/services";
import { ArkosPrismaInput } from "arkos/prisma";
import { Prisma, PrismaClient } from "@prisma/client"

export interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  foreignKeyField?: string;
  foreignReferenceField?: string;
  isRelation: boolean;
  defaultValue?: any;
  isId?: boolean;
  isUnique?: boolean;
  attributes: string[];
}


export declare type ModelsGetPayload<T extends Record<string, any>> = {
${prismaSchemaParser.models.map(
  (model) =>
    `
    "${kebabCase(model.name)}": {
        Delegate: Prisma.${model.name}Delegate,
        GetPayload: Prisma.${model.name}GetPayload<T>,
        FindManyArgs: Prisma.${model.name}FindManyArgs,
        FindFirstArgs: Prisma.${model.name}FindFirstArgs,
        CreateArgs: Prisma.${model.name}CreateArgs,
        CreateManyArgs: Prisma.${model.name}CreateManyArgs,
        UpdateArgs: Prisma.${model.name}UpdateArgs,
        UpdateManyArgs: Prisma.${model.name}UpdateManyArgs,
        DeleteArgs: Prisma.${model.name}DeleteArgs,
        DeleteManyArgs: Prisma.${model.name}DeleteManyArgs,
        CountArgs: Prisma.${model.name}CountArgs
    }
`
)}
}

export type ExtractFilters<T> = T extends { where?: infer W; [x: string]: any } ? W : any;
export type ExtractQueryOptions<T, K extends keyof T = never> = Omit<T, K>;
export type ExtractData<T> = T extends { data: infer D; [x: string]: any } ? D : any;


/**
 * Base service class for handling CRUD operations on a specific model.
 * This class provides standard implementation of data operations that can be extended
 *
 * by model-specific service classes.
 *
 * @class BaseService
 *
 * @usage
 *
 * **Example:** creating a simple service
 *
 * \`\`\`ts
 * import { BaseService } from "arkos/services"
 *
 * export class UserService extends BaseService<"user"> {}
 *
 * const userService = new UserService("user")
 * \`\`\`
 *
 * **Example:** accessing request context in hooks
 *
 * \`\`\`
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-service-class}
 * @see {@link https://www.arkosjs.com/docs/guide/accessing-request-context-in-services}
 *
 */
export declare class BaseService<
    TModelName extends keyof ModelsGetPayload<any>
> {
    modelName: TModelName;
    relationFields: {
        singular: PrismaField[] | undefined;
        list: PrismaField[] | undefined;
    };
    prisma: PrismaClient;
    
    constructor(modelName: TModelName);
    
    /**
     * Creates a single record in the database.
     *
     * @template TOptions - The query options type extending query options excluding 'data'
     * @param {ExtractData} data - The data for creating the record
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload>} The created record
     *
     * @example
     * \`\`\`ts
     * const user = await userService.createOne({
     *   name: "John Doe",
     *   email: "john@example.com"
     * });
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With query options
     * const user = await userService.createOne(
     *   { name: "John Doe", email: "john@example.com" },
     *   { include: { posts: true } }
     * );
     * \`\`\`
     */
    createOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateArgs'], 'data'>>(
        data: ExtractData<ModelsGetPayload<any>[TModelName]['CreateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;

    /**
     * Creates multiple records in the database.
     *
     * @template TOptions - The query options type extending query options excluding 'data'
     * @param {ExtractData} data - Array of data objects or object with data array
     * @param {TOptions} [queryOptions] - Optional Prisma query options
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<Array>} Array of created records
     *
     * @example
     * \`\`\`ts
     * const users = await userService.createMany([
     *   { name: "John Doe", email: "john@example.com" },
     *   { name: "Jane Smith", email: "jane@example.com" }
     * ]);
     * \`\`\`
     */
    createMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateManyArgs'], 'data'>>(
        data: ExtractData<ModelsGetPayload<any>[TModelName]['CreateManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'][]>;

    /**
     * Counts records matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {ExtractFilters} [filters] - Optional where conditions to filter records
     * @param {TOptions} [queryOptions] - Optional Prisma query options
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<number>} The count of matching records
     *
     * @example
     * \`\`\`ts
     * const totalUsers = await userService.count();
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * const activeUsers = await userService.count({
     *   status: "active"
     * });
     * \`\`\`
     */  
    count<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CountArgs'], 'where'>>(
        filters?: ExtractFilters<ModelsGetPayload<any>[TModelName]['CountArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<number>;

    /**
     * Finds multiple records matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {ExtractFilters} [filters] - Optional where conditions to filter records
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, orderBy, skip, take, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<Array>} Array of matching records
     *
     * @example
     * \`\`\`ts
     * const users = await userService.findMany({
     *   status: "active"
     * });
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With pagination and ordering
     * const users = await userService.findMany(
     *   { status: "active" },
     *   { orderBy: { createdAt: "desc" }, take: 10, skip: 0 }
     * );
     * \`\`\`
     */
    findMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindManyArgs'], 'where'>>(
        filters?: ExtractFilters<ModelsGetPayload<any>[TModelName]['FindManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'][]>;

    /**
     * Finds a single record by its ID.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {string | number} id - The unique identifier of the record
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload | null>} The matching record or null if not found
     *
     * @example
     * \`\`\`ts
     * const user = await userService.findById("user-123");
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With relations
     * const user = await userService.findById(
     *   "user-123",
     *   { include: { posts: true, profile: true } }
     * );
     * \`\`\`
     */
    findById<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>(
        id: string | number, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'] | null>;

    /**
     * Updates a single record matching the specified id.
     *
     * @template TOptions - The query options type extending query options excluding 'where' and 'data'
     * @param {string | number} id - The unique identifier of the record
     * @param {ExtractData} data - The data to update
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload>} The updated record
     *
     * @example
     * \`\`\`ts
     * const updatedUser = await userService.updateById(
     *   "user-123",
     *   { name: "John Updated" }
     * );
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With relations
     * const updatedUser = await userService.updateById(
     *   "user-123",
     *   { name: "John Updated" },
     *   { include: { posts: true } }
     * );
     * \`\`\`
     */
    updateById<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateArgs'], 'where' | 'data'>>(
        id: string | number,
        data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;

    /**
     * Deletes a single record matching the specified id.
     *
     * @param {string | number} id - The unique identifier of the record
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload>} The deleted record
     *
     * @example
     * \`\`\`ts
     * const deletedUser = await userService.deleteById("user-123");
     * \`\`\`
     */
    deleteById(
        id: string | number,
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<any>[TModelName]['GetPayload']>;

    /**
     * Finds the first record matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {ExtractFilters} filters - Where conditions to filter records
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, orderBy, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload | null>} The first matching record or null if not found
     *
     * @example
     * \`\`\`ts
     * const user = await userService.findOne({
     *   email: "john@example.com"
     * });
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With relations and ordering
     * const latestPost = await postService.findOne(
     *   { published: true },
     *   { include: { author: true }, orderBy: { createdAt: "desc" } }
     * );
     * \`\`\`
     */
    findOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['FindManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'] | null>;

    /**
     * Updates a single record matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where' and 'data'
     * @param {ExtractFilters} filters - Where conditions to identify the record to update
     * @param {ExtractData} data - The data to update
     * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, etc.)
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload>} The updated record
     *
     * @example
     * \`\`\`ts
     * const updatedUser = await userService.updateOne(
     *   { id: "user-123" },
     *   { name: "John Updated" }
     * );
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With relations
     * const updatedUser = await userService.updateOne(
     *   { id: "user-123" },
     *   { name: "John Updated" },
     *   { include: { posts: true } }
     * );
     * \`\`\`
     */
    updateOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateArgs'], 'where' | 'data'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['UpdateArgs']>, 
        data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;

    /**
     * Updates multiple records matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where' and 'data'
     * @param {ExtractFilters} filters - Where conditions to identify records to update
     * @param {ExtractData} data - The data to update
     * @param {TOptions} [queryOptions] - Optional Prisma query options
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<{ count: number }>} Object containing count of updated records
     *
     * @example
     * \`\`\`ts
     * const result = await userService.updateMany(
     *   { status: "pending" },
     *   { status: "active" }
     * );
     * console.log(result.count); // Number of updated records
     * \`\`\`
     */
    updateMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateManyArgs'], 'where' | 'data'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['UpdateManyArgs']>, 
        data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<{ count: number }>;

    /**
     * Deletes a single record matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {ExtractFilters} filters - Where conditions to identify the record to delete
     * @param {TOptions} [queryOptions] - Optional Prisma query options
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<ModelsGetPayload>} The deleted record
     *
     * @example
     * \`\`\`ts
     * const deletedUser = await userService.deleteOne({
     *   id: "user-123"
     * });
     * \`\`\`
     */
    deleteOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['DeleteArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;

    /**
     * Deletes multiple records matching the specified filters.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {ExtractFilters} filters - Where conditions to identify records to delete
     * @param {TOptions} [queryOptions] - Optional Prisma query options
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<{ count: number }>} Object containing count of deleted records
     *
     * @example
     * \`\`\`ts
     * const result = await userService.deleteMany({
     *   status: "inactive"
     * });
     * console.log(result.count); // Number of deleted records
     * \`\`\`
     */
    deleteMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteManyArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['DeleteManyArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<{ count: number }>;

    /**
     * Performs multiple update operations in a single transaction.
     * Each item in the data array must contain filter criteria to identify the record to update.
     *
     * @template TOptions - The query options type extending query options excluding 'where' and 'data'
     * @param {Array<UpdateOneData>} dataArray - Array of update objects, each containing filter criteria and data
     * @param {TOptions} [queryOptions] - Optional Prisma query options applied to all updates
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<Array<ModelsGetPayload>>} Array of updated records
     *
     * @example
     * \`\`\`ts
     * const results = await userService.batchUpdate([
     *   { where: { id: "user-1" }, data: { status: "active" } },
     *   { where: { id: "user-2" }, data: { status: "inactive" } }
     * ]);
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With query options for all updates
     * const results = await userService.batchUpdate(
     *   [
     *     { where: { id: "user-1" }, data: { status: "active" } },
     *     { where: { id: "user-2" }, data: { status: "inactive" } }
     *   ],
     *   { include: { posts: true } }
     * );
     * \`\`\`
     */
    batchUpdate<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateArgs'], 'where' | 'data'>>(
        dataArray: Array<{
            where: ExtractFilters<ModelsGetPayload<any>[TModelName]['UpdateArgs']>,
            data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateArgs']>
        }>,
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<Array<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>>;

    /**
     * Performs multiple delete operations in a single transaction.
     *
     * @template TOptions - The query options type extending query options excluding 'where'
     * @param {Array<ExtractFilters>} batchFilters - Array of where conditions, each identifying a record to delete
     * @param {TOptions} [queryOptions] - Optional Prisma query options applied to all deletes
     * @param {ServiceBaseContext} [context] - Optional service execution context
     * @returns {Promise<Array<ModelsGetPayload>>} Array of deleted records
     *
     * @example
     * \`\`\`ts
     * const deletedUsers = await userService.batchDelete([
     *   { id: "user-1" },
     *   { id: "user-2" },
     *   { id: "user-3" }
     * ]);
     * \`\`\`
     *
     * @example
     * \`\`\`ts
     * // With query options
     * const deletedUsers = await userService.batchDelete(
     *   [
     *     { id: "user-1" },
     *     { id: "user-2" }
     *   ],
     *   { include: { posts: true } }
     * );
     * \`\`\`
     */
    batchDelete<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteArgs'], 'where'>>(
        batchFilters: Array<ExtractFilters<ModelsGetPayload<any>[TModelName]['DeleteArgs']>>,
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<Array<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>>;
}
`;
  execSync("npx prisma generate", { stdio: "inherit" });

  const filePath = path.resolve(process.cwd(), `node_modules/@arkosjs/types/`);
  fs.mkdirSync(filePath, { recursive: true });
  fs.writeFileSync(filePath + "/base.service.d.ts", content, {
    encoding: "utf8",
  });

  const pkgPath = path.resolve(
    process.cwd(),
    `node_modules/@arkosjs/types/package.json`
  );

  const pkgJsonContent = `{
      "name": "@arkosjs/types",
      "version": "1.0.0",
      "types": "./base.service.d.ts",
      "exports": {
        "./base.service": "./base.service.d.ts"
      }
    }`;
  fs.writeFileSync(pkgPath, pkgJsonContent, {
    encoding: "utf8",
  });

  sheu.done(
    "Types for @prisma/client and base service generated successfully!"
  );
}
