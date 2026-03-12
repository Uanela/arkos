import fs from "fs";
import path from "path";

/**
 * Options for configuring the Bundler instance.
 */
interface BundlerOptions {
  /** Output file extension: ".js" | ".cjs" | ".mjs" */
  ext: string;
  /** Directory containing the compiled output files to process */
  outDir: string;
  /** Source root directory used to resolve tsconfig paths. Defaults to process.cwd() */
  rootDir?: string;
  /** Explicit path to tsconfig.json or jsconfig.json. Auto-detected from rootDir if omitted */
  configPath?: string;
}

/**
 * Resolved path aliases and base URL extracted from tsconfig/jsconfig.
 */
interface ResolvedPaths {
  /** Absolute path used as the base for resolving alias targets */
  baseUrl: string;
  /** Map of alias patterns to their target path arrays, e.g. { "@/*": ["src/*"] } */
  paths: Record<string, string[]>;
}

/**
 * A pre-compiled alias entry for efficient matching at runtime.
 */
interface CompiledAlias {
  /** The alias prefix, e.g. "@" for "@/*" or "@utils" for "@utils/*" */
  prefix: string;
  /** Whether the alias uses a wildcard, e.g. "@/*" vs "@root" */
  isWildcard: boolean;
  /** Ordered list of target paths to try when the alias matches */
  targets: string[];
}

/**
 * Post-compilation import rewriter and alias resolver.
 *
 * Recursively processes all `.js`, `.cjs`, and `.mjs` files in the output
 * directory, rewriting:
 * - Relative imports to include the correct file extension
 * - Directory imports to use `/index.ext`
 * - Path aliases defined in tsconfig/jsconfig `paths` to relative paths
 *
 * Bare node_modules specifiers (e.g. `"express"`, `"@prisma/client"`) are
 * left untouched.
 *
 * @example
 * ```ts
 * const bundler = new Bundler({
 *   ext: ".js",
 *   outDir: "./dist",
 *   rootDir: "./",
 *   configPath: "./tsconfig.json",
 * });
 *
 * bundler.bundle();
 * ```
 */
export class Bundler {
  private ext: string;
  private outDir: string;
  private rootDir: string;
  private resolvedPaths: ResolvedPaths;
  private compiledAliases: CompiledAlias[];

  /**
   * Regexes for matching all import/export/require statement forms.
   * Defined as static to avoid recreation per file processed.
   */
  private static readonly IMPORT_REGEXES = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  /**
   * Creates a new Bundler instance and eagerly loads and compiles
   * alias configuration from tsconfig/jsconfig.
   *
   * @param options - Configuration options for the bundler
   */
  constructor(options: BundlerOptions) {
    this.ext = options.ext;
    this.outDir = path.resolve(options.outDir);
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.resolvedPaths = this.loadConfig(options.configPath);
    this.compiledAliases = this.compileAliases();
  }

  /**
   * Pre-compiles path alias patterns into a lookup-friendly structure.
   * Called once in the constructor so alias matching during `bundle()` is O(n)
   * over aliases rather than re-parsing patterns per import.
   */
  private compileAliases(): CompiledAlias[] {
    return Object.entries(this.resolvedPaths.paths).map(
      ([pattern, targets]) => {
        const isWildcard = pattern.endsWith("/*");
        return {
          prefix: isWildcard ? pattern.slice(0, -2) : pattern,
          isWildcard,
          targets,
        };
      }
    );
  }

  /**
   * Loads and parses the tsconfig/jsconfig file, resolving any `extends` chain.
   * Falls back to `{ baseUrl: rootDir, paths: {} }` if no config is found.
   *
   * @param configPath - Explicit config path, or undefined to auto-detect
   */
  private loadConfig(configPath?: string): ResolvedPaths {
    const resolved = configPath
      ? path.resolve(configPath)
      : this.findConfig(this.rootDir);

    if (!resolved || !fs.existsSync(resolved)) {
      return { baseUrl: this.rootDir, paths: {} };
    }

    return this.parseConfig(resolved);
  }

  /**
   * Searches for a tsconfig.json or jsconfig.json in the given directory.
   * Prefers tsconfig.json over jsconfig.json.
   *
   * @param dir - Directory to search in
   * @returns Absolute path to the config file, or null if not found
   */
  private findConfig(dir: string): string | null {
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  /**
   * Recursively parses a tsconfig/jsconfig file, following `extends` chains
   * and merging `paths` with child config taking precedence over parent.
   *
   * @param configPath - Absolute path to the config file to parse
   */
  private parseConfig(configPath: string): ResolvedPaths {
    const configDir = path.dirname(configPath);
    const raw = this.readJsonWithComments(configPath);

    let base: ResolvedPaths = { baseUrl: this.rootDir, paths: {} };

    if (raw.extends) {
      const isPackage = !raw.extends.startsWith(".");
      const parentPath = isPackage
        ? this.resolveNodeModulesConfig(raw.extends)
        : path.resolve(configDir, raw.extends);

      if (parentPath && fs.existsSync(parentPath)) {
        base = this.parseConfig(parentPath);
      }
    }

    const co = raw.compilerOptions || {};
    const baseUrl = co.baseUrl
      ? path.resolve(configDir, co.baseUrl)
      : base.baseUrl;

    return {
      baseUrl,
      paths: { ...base.paths, ...(co.paths || {}) },
    };
  }

  /**
   * Resolves a tsconfig `extends` value that points to a node_modules package,
   * e.g. `"@tsconfig/node18/tsconfig.json"`.
   *
   * @param extendsValue - The raw extends string from tsconfig
   * @returns Absolute path to the resolved config file, or null if not found
   */
  private resolveNodeModulesConfig(extendsValue: string): string | null {
    try {
      return require.resolve(extendsValue, { paths: [this.rootDir] });
    } catch {
      return null;
    }
  }

  /**
   * Reads a JSON file that may contain comments and trailing commas
   * (as tsconfig/jsconfig files allow) and returns the parsed object.
   *
   * @param filePath - Absolute path to the JSON file
   * @returns Parsed object, or empty object if parsing fails
   */
  private readJsonWithComments(filePath: string): any {
    const raw = fs.readFileSync(filePath, "utf8");

    return JSON.parse(
      raw
        .replace(
          /("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
          (_, str) => str ?? ""
        )
        .replace(/,(\s*[}\]])/g, "$1")
    );
  }

  /**
   * Resolves a single import path to its final rewritten form.
   *
   * Resolution order:
   * 1. Relative imports (`./`, `../`) — extension is added via `addExtension`
   * 2. Aliased imports — matched against compiled aliases and converted to relative paths
   * 3. Bare specifiers (`express`, `@prisma/client`) — returned untouched
   *
   * @param importPath - The raw import string from source code
   * @param fileDir - Absolute directory of the file containing the import
   * @returns The rewritten import path
   */
  private resolveImport(importPath: string, fileDir: string): string {
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
      return this.addExtension(importPath, fileDir);
    }

    for (const alias of this.compiledAliases) {
      if (alias.isWildcard) {
        if (!importPath.startsWith(alias.prefix + "/")) continue;
        const remainder = importPath.slice(alias.prefix.length + 1);

        for (const target of alias.targets) {
          const resolved = path.resolve(
            this.resolvedPaths.baseUrl,
            target.replace("*", remainder)
          );
          const outPath = this.sourceToOut(resolved);
          return this.addExtension(this.toRelative(fileDir, outPath), fileDir);
        }
      } else {
        if (importPath !== alias.prefix) continue;

        for (const target of alias.targets) {
          const resolved = path.resolve(this.resolvedPaths.baseUrl, target);
          const outPath = this.sourceToOut(resolved);
          return this.addExtension(this.toRelative(fileDir, outPath), fileDir);
        }
      }
    }

    return importPath;
  }

  /**
   * Appends the configured extension to an import path if not already present.
   * If the path resolves to a directory containing an `index` file, appends
   * `/index.ext` instead.
   *
   * @param importPath - The relative import path to fix
   * @param fileDir - Absolute directory of the file containing the import
   * @returns The import path with the correct extension
   */
  private addExtension(importPath: string, fileDir: string): string {
    if (importPath.endsWith(this.ext)) return importPath;

    const absolute = path.resolve(fileDir, importPath);
    if (fs.existsSync(absolute + "/index" + this.ext)) {
      return importPath + "/index" + this.ext;
    }

    return importPath + this.ext;
  }

  /**
   * Maps an absolute source-tree path to its corresponding path in outDir.
   * Paths outside rootDir are returned unchanged.
   *
   * @param sourcePath - Absolute path in the source tree
   * @returns Absolute path in the output tree
   */
  private sourceToOut(sourcePath: string): string {
    return sourcePath.startsWith(this.rootDir)
      ? path.join(this.outDir, sourcePath.slice(this.rootDir.length))
      : sourcePath;
  }

  /**
   * Converts an absolute path to a relative path from a given directory,
   * ensuring the result always starts with `./` or `../`.
   *
   * @param fromDir - The directory to compute the relative path from
   * @param toPath - The absolute target path
   * @returns A POSIX-style relative path
   */
  private toRelative(fromDir: string, toPath: string): string {
    const rel = path.relative(fromDir, toPath).replace(/\\/g, "/");
    return rel.startsWith(".") ? rel : "./" + rel;
  }

  /**
   * Rewrites all import/export/require statements in a string of JS source code.
   * Each regex is reset before use since they are stateful with the `/g` flag.
   *
   * @param content - Raw file content to process
   * @param fileDir - Absolute directory of the file being processed
   * @returns The file content with all imports rewritten
   */
  private rewriteImports(content: string, fileDir: string): string {
    for (const regex of Bundler.IMPORT_REGEXES) {
      regex.lastIndex = 0;
      content = content.replace(regex, (match, p) => {
        const fixed = this.resolveImport(p, fileDir);
        return fixed === p ? match : match.replace(p, fixed);
      });
    }
    return content;
  }

  /**
   * Recursively processes all `.js`, `.cjs`, and `.mjs` files in the output
   * directory, rewriting imports in-place. Files whose content is unchanged
   * are not written back to disk.
   *
   * @param dir - Directory to process. Defaults to `outDir`.
   */
  bundle(dir: string = this.outDir): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.bundle(fullPath);
      } else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        const updated = this.rewriteImports(content, path.dirname(fullPath));
        if (updated !== content) fs.writeFileSync(fullPath, updated);
      }
    }
  }
}
