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
    console.info(`✅ Updated ${filePath} to import from ${localImportPath}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  typeReplacements.forEach(({ filePath, localImportPath, exportName }) => {
    replaceWholeBaseServiceDifinition(filePath, localImportPath, exportName);
  });

  console.info("\n✅ All type replacements completed successfully!");
}

main();
