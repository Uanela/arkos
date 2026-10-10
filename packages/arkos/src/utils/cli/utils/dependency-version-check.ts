import { getPackageJson } from "../../helpers/global.helpers";
import { getArkosConfig } from "../../helpers/arkos-config.helpers";

export const SUPPORTED_ZOD_MAJOR = 4;

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/**
 * Reads the version range declared for a dependency in the user's package.json.
 *
 * @returns The declared range (e.g. "^3.24.2") or `null` when not declared.
 */
export function getDeclaredDependencyVersion(
  packageName: string
): string | null {
  const pkg = getPackageJson();

  for (const section of DEPENDENCY_SECTIONS) {
    const version = pkg?.[section]?.[packageName];
    if (typeof version === "string") return version;
  }

  return null;
}

/**
 * Extracts the major version number from a declared semver range.
 *
 * @example
 * ```ts
 * parseMajorVersion("^3.24.2") // 3
 * parseMajorVersion(">=4.0.0") // 4
 * parseMajorVersion("latest")  // null
 * ```
 */
function parseMajorVersion(versionRange: string): number | null {
  const match = versionRange.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

/**
 * Ensures the Zod version declared in the user's project is supported by Arkos.
 *
 * Zod is optional - this is a no-op unless the project declares `zod` **and**
 * uses it as the validation resolver (`validation.resolver` set to `"zod"` or
 * `"hybrid"`).
 *
 * @throws {Error} When the declared Zod version is below v4.
 */
function assertZodVersion(): void {
  const declaredVersion = getDeclaredDependencyVersion("zod");

  if (!declaredVersion) return;

  const resolver = getArkosConfig()?.validation?.resolver;

  if (resolver !== "zod" && resolver !== "hybrid") return;

  const major = parseMajorVersion(declaredVersion);

  if (major === null || major >= SUPPORTED_ZOD_MAJOR) return;

  throw new Error(
    `Unsupported zod version. Arkos 1.8+ requires at least zod 4, please install zod 4 instead.`
  );
}

/**
 * Asserts every package version requirement of the user's project.
 *
 * New dependency checks can be added here as Arkos requirements evolve.
 *
 * @throws {Error} When a required package version is not supported.
 */
export function assertRequiredPackageVersion(): void {
  assertZodVersion();
}
