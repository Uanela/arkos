import prismaSchemaParser from "../prisma/prisma-schema-parser";
import { kebabCase } from "../helpers/change-case.helpers";
import fs from "fs";
import { execSync } from "child_process";
import sheu from "../sheu";
import path from "path";

export default function prismaGenerateCommand() {
    const content = `
import { ModelGroupRelationFields } from "./utils/helpers/base.service.helpers";
import { ServiceBaseContext } from "./types/base.service.types";
import { Prisma, PrismaClient } from "@prisma/client"

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

export declare class BaseService<
    TModelName extends keyof ModelsGetPayload<any>
> {
    modelName: TModelName;
    relationFields: ModelGroupRelationFields;
    prisma: PrismaClient;
    
    constructor(modelName: TModelName);
    
    createOne<TOptions extends ExtractQueryOptions<ModelsGetPayload<any>[TModelName]['CreateArgs'], 'data'>>(
        data: ExtractData<ModelsGetPayload<any>[TModelName]['CreateArgs']>, 
        queryOptions?: TOptions, 
        context?: ServiceBaseContext
    ): Promise<ModelsGetPayload<TOptions>[TModelName]['GetPayload']>;
    
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
        __dirname,
        `../../../types/modules/base/base.service.d.ts`
    );
    fs.writeFileSync(filePath, content, {
        encoding: "utf8",
    });

    sheu.done(
        "Types for @prisma/client and base service generated successfully!"
    );
}
