import fs from "fs";
import path from "path";

interface BundlerOptions {
  /** Output extension: ".js" | ".cjs" | ".mjs" */
  ext: string;
  /** Root dir to start processing (usually the compiled output dir) */
  outDir: string;
  /** Source root dir (to resolve tsconfig paths relative to) */
  rootDir?: string;
  /** Path to tsconfig/jsconfig. If omitted, auto-detected from rootDir/cwd */
  configPath?: string;
}

interface ResolvedPaths {
  baseUrl: string;
  paths: Record<string, string[]>;
}

export class Bundler {
  private ext: string;
  private outDir: string;
  private rootDir: string;
  private resolvedPaths: ResolvedPaths;

  constructor(options: BundlerOptions) {
    this.ext = options.ext;
    this.outDir = path.resolve(options.outDir);
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.resolvedPaths = this.loadConfig(options.configPath);
  }

  private loadConfig(configPath?: string): ResolvedPaths {
    const resolved = configPath
      ? path.resolve(configPath)
      : this.findConfig(this.rootDir);

    if (!resolved || !fs.existsSync(resolved)) {
      return { baseUrl: this.rootDir, paths: {} };
    }

    return this.parseConfig(resolved);
  }

  private findConfig(dir: string): string | null {
    // Prefer tsconfig.json, fall back to jsconfig.json
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  private parseConfig(configPath: string): ResolvedPaths {
    const configDir = path.dirname(configPath);
    const raw = this.readJsonWithComments(configPath);

    // Handle "extends" — recursively merge parent first, child wins
    let base: ResolvedPaths = { baseUrl: this.rootDir, paths: {} };
    if (raw.extends) {
      const parentPath = path.resolve(configDir, raw.extends);
      // Handle extends pointing to a package (e.g. "@tsconfig/node18/tsconfig.json")
      const resolvedParent = parentPath.includes("node_modules")
        ? this.resolveNodeModulesConfig(raw.extends)
        : parentPath;

      if (resolvedParent && fs.existsSync(resolvedParent)) {
        base = this.parseConfig(resolvedParent);
      }
    }

    const co = raw.compilerOptions || {};

    const baseUrl = co.baseUrl
      ? path.resolve(configDir, co.baseUrl)
      : base.baseUrl;

    // Merge paths: child overrides parent keys
    const paths: Record<string, string[]> = {
      ...base.paths,
      ...(co.paths || {}),
    };

    return { baseUrl, paths };
  }

  private resolveNodeModulesConfig(extendsValue: string): string | null {
    try {
      // e.g. "@tsconfig/node18/tsconfig.json"
      return require.resolve(extendsValue, { paths: [this.rootDir] });
    } catch {
      return null;
    }
  }

  private readJsonWithComments(filePath: string): any {
    const raw = fs.readFileSync(filePath, "utf8");
    // Strip single-line and block comments (tsconfig allows them)
    const stripped = raw
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([}\]])/g, "$1"); // trailing commas
    try {
      return JSON.parse(stripped);
    } catch {
      return {};
    }
  }

  /**
   * Checks if an import is a bare node_modules specifier.
   * Examples that return true:  "express", "@prisma/client", "lodash/merge"
   * Examples that return false: "./foo", "../bar", "@/utils" (if @ is aliased)
   */
  private isBareSpecifier(importPath: string): boolean {
    if (importPath.startsWith(".") || importPath.startsWith("/")) return false;

    // Check if it matches any configured alias prefix
    for (const pattern of Object.keys(this.resolvedPaths.paths)) {
      const prefix = pattern.replace(/\*$/, "");
      if (importPath.startsWith(prefix)) return false;
    }

    // Everything else is a real node_modules package
    return true;
  }

  /**
   * Tries to resolve an aliased import to a relative path.
   * Returns null if no alias matches.
   */
  private resolveAlias(
    importPath: string,
    currentFileDir: string
  ): string | null {
    for (const [pattern, targets] of Object.entries(this.resolvedPaths.paths)) {
      const isWildcard = pattern.endsWith("/*");
      const prefix = isWildcard ? pattern.slice(0, -2) : pattern; // strip "/*"

      let remainder = "";

      if (isWildcard) {
        if (!importPath.startsWith(prefix + "/")) continue;
        remainder = importPath.slice(prefix.length + 1);
      } else {
        if (importPath !== pattern) continue;
      }

      // Try each target in order, take first that exists
      for (const target of targets) {
        const resolvedTarget = isWildcard
          ? target.replace("*", remainder)
          : target;

        // Resolve from baseUrl, but we need the OUTPUT path
        // Map source path -> output path by replacing rootDir with outDir
        const absoluteSource = path.resolve(
          this.resolvedPaths.baseUrl,
          resolvedTarget
        );
        const absoluteOut = this.sourceToOut(absoluteSource);

        const relative = this.toRelative(currentFileDir, absoluteOut);
        return relative;
      }
    }

    return null;
  }

  /**
   * Maps a source-tree absolute path to its equivalent in outDir.
   */
  private sourceToOut(sourcePath: string): string {
    if (sourcePath.startsWith(this.rootDir)) {
      return path.join(this.outDir, sourcePath.slice(this.rootDir.length));
    }
    return sourcePath;
  }

  /**
   * Makes an absolute path relative from a given directory,
   * ensuring it starts with "./" or "../".
   */
  private toRelative(fromDir: string, toPath: string): string {
    let rel = path.relative(fromDir, toPath);
    if (!rel.startsWith(".")) rel = "./" + rel;
    // Normalize Windows backslashes
    return rel.replace(/\\/g, "/");
  }

  private fixImportPath(fileDir: string, importPath: string): string {
    // 1. Skip bare node_modules specifiers (express, @prisma/client, etc.)
    if (this.isBareSpecifier(importPath)) return importPath;

    // 2. Try alias resolution first
    const aliasResolved = this.resolveAlias(importPath, fileDir);
    const workingPath = aliasResolved ?? importPath;

    // 3. Already has the right extension — leave it
    if (workingPath.endsWith(this.ext)) return workingPath;

    // 4. Check if it resolves to a directory with index file
    const absoluteDir = aliasResolved
      ? path.resolve(fileDir, workingPath)
      : path.resolve(fileDir, workingPath);

    if (fs.existsSync(absoluteDir + "/index" + this.ext)) {
      return workingPath + "/index" + this.ext;
    }

    return workingPath + this.ext;
  }

  private rewriteImports(content: string, fileDir: string): string {
    const replace = (match: string, p: string): string => {
      const fixed = this.fixImportPath(fileDir, p);
      return match.replace(p, fixed);
    };

    // from "..."
    content = content.replace(/from\s+['"]([^'"]+)['"]/g, replace);
    // import "..." (side-effect)
    content = content.replace(/import\s+['"]([^'"]+)['"]/g, replace);
    // dynamic import("...")
    content = content.replace(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, replace);
    // require("...")
    content = content.replace(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, replace);

    return content;
  }

  /**
   * Recursively processes all JS/CJS/MJS files in outDir,
   * rewriting relative imports and resolving aliases.
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
        fs.writeFileSync(fullPath, updated);
      }
    }
  }
}
