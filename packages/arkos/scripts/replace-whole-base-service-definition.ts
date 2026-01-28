import { writeFileSync } from "fs";

interface TypeReplacement {
  filePath: string;
  localImportPath: string; // The @arkosjs/types path to import from
  exportName: string; // The type/class name to re-export
}

const typeReplacements: TypeReplacement[] = [
  {
    filePath: "dist/types/modules/base/base.service.d.ts",
    localImportPath: "@arkosjs/types/base.service",
    exportName: "BaseService",
  },
];

export function replaceWholeBaseServiceDifinition(
  filePath: string,
  localImportPath: string,
  exportName: string
): void {
  try {
    const newContent = `// Auto-generated: imports from locally generated types
import { ${exportName} } from '${localImportPath}';

export { ${exportName} };
export type * from '${localImportPath}';
`;

    writeFileSync(filePath, newContent, "utf-8");
    console.info(`Updated ${filePath} to import from ${localImportPath}`);
  } catch (error) {
    console.error(`Failed to update ${filePath}:`, error);
    process.exit(1);
  }
}

export function replaceArkosRequestStaticTypes(): void {
  const filePath = "dist/types/types/arkos-request.d.ts";
  const localImportPath = "@arkosjs/types/base.service";

  try {
    const newContent = `// Auto-generated: imports from locally generated types
import { ModelsGetPayload } from '${localImportPath}';
import { Request } from "express";

export interface BaseUser extends Record<string, any> {
  id: string;
  isSuperUser: boolean;
  password: string;
  passwordChangedAt?: Date;
  deletedSelfAccountAt: Date;
  isActive: boolean;
}

type UserModelPayload = ModelsGetPayload<{}> extends { user: infer U } 
  ? U extends { GetPayload: infer P } 
    ? P 
    : never 
  : never;

export type User = UserModelPayload extends never 
  ? BaseUser 
  : UserModelPayload;

export interface ArkosRequest<
  P extends Record<string, any> = any,
  ResBody = any,
  ReqBody = any,
  Query extends Record<string, any> = any,
> extends Request<P, ResBody, ReqBody, Query> {
  /**
   * Authenticated user 
   */
  user?: User | undefined;

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
`;
    writeFileSync(filePath, newContent, "utf-8");
    console.info(`Updated ${filePath} to import from ${localImportPath}`);
  } catch (error) {
    console.error(`Failed to update ${filePath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  typeReplacements.forEach(({ filePath, localImportPath, exportName }) => {
    replaceWholeBaseServiceDifinition(filePath, localImportPath, exportName);
  });
  replaceArkosRequestStaticTypes();

  console.info("\nAll type replacements completed successfully!");
}

main();
