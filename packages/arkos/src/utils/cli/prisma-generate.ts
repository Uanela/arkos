import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../sheu";
import path from "path";

export default function prismaGenerateCommand() {
    const content = `
import { ServiceBaseContext } from "arkos/services";
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
    * @template TOptions - The query options type extending CreateOneOptions<T>
    * @param {CreateOneData<T>} data - The data for creating the record
    * @param {TOptions} [queryOptions] - Optional Prisma query options (select, include, etc.)
    * @param {ServiceBaseContext} [context] - Optional service execution context
    * @returns {Promise<CreateOneResult<T>>} The created record
    *
    * @example
    * ```ts
    * const user = await userService.createOne({
    *   name: "John Doe",
    *   email: "john@example.com"
    * });
    * ```
    *
    * @example
    * ```ts
    * // With query options
    * const user = await userService.createOne(
    *   { name: "John Doe", email: "john@example.com" },
    *   { include: { posts: true } }
    * );
    * ```
    */
    createOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateArgs'], 'data'>>(
        data: ExtractData<ModelsGetPayload<any>[TModelName]['CreateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;
    
    /**
    * Creates multiple records in the database.
    *
    * @template TOptions - The query options type extending CreateManyOptions<T>
    * @param {CreateManyData<T>} data - Array of data objects or object with data array
    * @param {TOptions} [queryOptions] - Optional Prisma query options
    * @param {ServiceBaseContext} [context] - Optional service execution context
    * @returns {Promise<CreateManyResult<T>>} Object containing count of created records
    *
    * @example
    * ```ts
    * const result = await userService.createMany([
    *   { name: "John Doe", email: "john@example.com" },
    *   { name: "Jane Smith", email: "jane@example.com" }
    * ]);
    * console.log(result.count); // 2
    * ```
    */
    createMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateManyArgs'], 'data'>>(
        data: ExtractData<ModelsGetPayload<any>[TModelName]['CreateManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'][]>;
    
    count<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CountArgs'], 'where'>>(
        filters?: ExtractFilters<ModelsGetPayload<any>[TModelName]['CountArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<number>;
    
    findMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindManyArgs'], 'where'>>(
        filters?: ExtractFilters<ModelsGetPayload<any>[TModelName]['FindManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'][]>;
    
    findById<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>(
        id: string | number, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'] | null>;
    
    findOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['FindFirstArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['FindManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload'] | null>;
    
    updateOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateArgs'], 'where' | 'data'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['UpdateArgs']>, 
        data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;
    
    updateMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['UpdateManyArgs'], 'where' | 'data'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['UpdateManyArgs']>, 
        data: ExtractData<ModelsGetPayload<any>[TModelName]['UpdateManyArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<{ count: number }>;
    
    deleteOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['DeleteArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;
    
    deleteMany<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['DeleteManyArgs'], 'where'>>(
        filters: ExtractFilters<ModelsGetPayload<any>[TModelName]['DeleteManyArgs']>, 
        queryOptions?: TOptions,
        context?: ServiceBaseContext
    ): Promise<{ count: number }>;
}
`;
    execSync("npx prisma generate", { stdio: "inherit" });

    const filePath = path.resolve(
        process.cwd(),
        `node_modules/@arkosjs/types/`
    );
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
