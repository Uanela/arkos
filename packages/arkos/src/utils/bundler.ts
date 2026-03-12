import fs from "fs";
import path from "path";

/**
 * Options for configuring a bundle run.
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
 * const bundler = new Bundler();
 *
 * bundler.bundle({
 *   ext: ".js",
 *   outDir: "./dist",
 *   rootDir: "./",
 *   configPath: "./tsconfig.json",
 * });
 * ```
 */
export class Bundler {
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
   * Pre-compiles path alias patterns into a lookup-friendly structure
   * so alias matching during processing is O(n) over aliases rather than
   * re-parsing patterns per import.
   */
  private compileAliases(resolvedPaths: ResolvedPaths): CompiledAlias[] {
    return Object.entries(resolvedPaths.paths).map(([pattern, targets]) => {
      const isWildcard = pattern.endsWith("/*");
      return {
        prefix: isWildcard ? pattern.slice(0, -2) : pattern,
        isWildcard,
        targets,
      };
    });
  }

  /**
   * Loads and parses the tsconfig/jsconfig file, resolving any `extends` chain.
   * Falls back to `{ baseUrl: rootDir, paths: {} }` if no config is found.
   *
   * @param rootDir - Absolute root directory
   * @param configPath - Explicit config path, or undefined to auto-detect
   */
  private loadConfig(rootDir: string, configPath?: string): ResolvedPaths {
    const resolved = configPath
      ? path.resolve(configPath)
      : this.findConfig(rootDir);

    if (!resolved || !fs.existsSync(resolved)) {
      return { baseUrl: rootDir, paths: {} };
    }

    return this.parseConfig(resolved, rootDir);
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
   * @param rootDir - Absolute root directory used as fallback baseUrl
   */
  private parseConfig(configPath: string, rootDir: string): ResolvedPaths {
    const configDir = path.dirname(configPath);
    const raw = this.readJsonWithComments(configPath);

    let base: ResolvedPaths = { baseUrl: rootDir, paths: {} };

    if (raw.extends) {
      const isPackage = !raw.extends.startsWith(".");
      const parentPath = isPackage
        ? this.resolveNodeModulesConfig(raw.extends, rootDir)
        : path.resolve(configDir, raw.extends);

      if (parentPath && fs.existsSync(parentPath)) {
        base = this.parseConfig(parentPath, rootDir);
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
   * @param rootDir - Root directory to resolve from
   * @returns Absolute path to the resolved config file, or null if not found
   */
  private resolveNodeModulesConfig(
    extendsValue: string,
    rootDir: string
  ): string | null {
    try {
      return require.resolve(extendsValue, { paths: [rootDir] });
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
   * @param ext - The output file extension
   * @param resolvedPaths - Resolved baseUrl and paths from tsconfig
   * @param compiledAliases - Pre-compiled alias entries
   */

  private resolveImport(
    importPath: string,
    fileDir: string,
    rootOutDir: string,
    rootDir: string,
    ext: string,
    resolvedPaths: ResolvedPaths,
    compiledAliases: CompiledAlias[]
  ): string {
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
      return this.addExtension(importPath, fileDir, ext);
    }

    for (const alias of compiledAliases) {
      if (alias.isWildcard) {
        if (!importPath.startsWith(alias.prefix + "/")) continue;
        const remainder = importPath.slice(alias.prefix.length + 1);

        for (const target of alias.targets) {
          const absoluteSource = path.resolve(
            resolvedPaths.baseUrl,
            target.replace("*", remainder)
          );
          const fileDirInSource = this.getFileDirInSource(
            fileDir,
            rootOutDir,
            rootDir,
            resolvedPaths.baseUrl
          );
          return this.addExtension(
            this.toRelative(fileDirInSource, absoluteSource),
            fileDir,
            ext
          );
        }
      } else {
        if (importPath !== alias.prefix) continue;
        for (const target of alias.targets) {
          const absoluteSource = path.resolve(resolvedPaths.baseUrl, target);
          const fileDirInSource = this.getFileDirInSource(
            fileDir,
            rootOutDir,
            rootDir,
            resolvedPaths.baseUrl
          );
          return this.addExtension(
            this.toRelative(fileDirInSource, absoluteSource),
            fileDir,
            ext
          );
        }
      }
    }

    return importPath;
  }

  private getFileDirInSource(
    fileDir: string,
    rootOutDir: string,
    rootDir: string,
    baseUrl: string
  ): string {
    const relToRootDir = path.relative(rootDir, rootOutDir);
    if (!relToRootDir) return baseUrl;

    // First component of relToRootDir is the dist folder name (e.g. "dist")
    const distFolderName = relToRootDir.split(path.sep)[0];
    const distRoot = path.join(rootDir, distFolderName);
    const relFromDistRoot = path.relative(distRoot, fileDir);
    return path.resolve(baseUrl, relFromDistRoot);
  }

  /**
   * Appends the configured extension to an import path if not already present.
   * If the path resolves to a directory containing an `index` file, appends
   * `/index.ext` instead.
   *
   * @param importPath - The relative import path to fix
   * @param fileDir - Absolute directory of the file containing the import
   * @param ext - The output file extension
   */
  private addExtension(
    importPath: string,
    fileDir: string,
    ext: string
  ): string {
    if (importPath.endsWith(ext)) return importPath;

    const absolute = path.resolve(fileDir, importPath);
    if (fs.existsSync(absolute + "/index" + ext)) {
      return importPath + "/index" + ext;
    }

    return importPath + ext;
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
   * @param ext - The output file extension
   * @param resolvedPaths - Resolved baseUrl and paths from tsconfig
   * @param compiledAliases - Pre-compiled alias entries
   */
  private rewriteImports(
    content: string,
    fileDir: string,
    rootOutDir: string,
    rootDir: string,
    ext: string,
    resolvedPaths: ResolvedPaths,
    compiledAliases: CompiledAlias[]
  ): string {
    for (const regex of Bundler.IMPORT_REGEXES) {
      regex.lastIndex = 0;
      content = content.replace(regex, (match, p) => {
        const fixed = this.resolveImport(
          p,
          fileDir,
          rootOutDir,
          rootDir,
          ext,
          resolvedPaths,
          compiledAliases
        );
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
   * @param options - Configuration options for this bundle run
   */
  bundle(options: BundlerOptions): void {
    const rootDir = path.resolve(options.rootDir || process.cwd());
    const outDir = path.resolve(options.outDir);
    const resolvedPaths = this.loadConfig(rootDir, options.configPath);
    const compiledAliases = this.compileAliases(resolvedPaths);

    this._bundleDir(
      options.ext,
      outDir,
      rootDir,
      resolvedPaths,
      compiledAliases,
      outDir
    );
  }

  /**
   * Internal recursive directory walker, separated so that `bundle()` only
   * resolves config once at the top level rather than on every recursion.
   */
  private _bundleDir(
    ext: string,
    rootOutDir: string,
    rootDir: string,
    resolvedPaths: ResolvedPaths,
    compiledAliases: CompiledAlias[],
    dir: string
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this._bundleDir(
          ext,
          rootOutDir,
          rootDir,
          resolvedPaths,
          compiledAliases,
          fullPath
        );
      } else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        const updated = this.rewriteImports(
          content,
          path.dirname(fullPath),
          rootOutDir,
          rootDir,
          ext,
          resolvedPaths,
          compiledAliases
        );
        if (updated !== content) fs.writeFileSync(fullPath, updated);
      }
    }
  }
}

export const bundler = new Bundler();
