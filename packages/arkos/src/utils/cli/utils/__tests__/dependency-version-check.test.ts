import { getPackageJson } from "../../../helpers/global.helpers";
import { getArkosConfig } from "../../../helpers/arkos-config.helpers";
import {
  assertRequiredPackageVersion,
  getDeclaredDependencyVersion,
  SUPPORTED_ZOD_MAJOR,
} from "../dependency-version-check";

jest.mock("../../../helpers/global.helpers");
jest.mock("../../../helpers/arkos-config.helpers");

const mockGetPackageJson = getPackageJson as jest.Mock;
const mockGetArkosConfig = getArkosConfig as jest.Mock;

function setProject(packageJson: any, resolver?: string) {
  mockGetPackageJson.mockReturnValue(packageJson);
  mockGetArkosConfig.mockReturnValue({
    validation: resolver ? { resolver } : {},
  });
}

describe("dependency-version-check", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDeclaredDependencyVersion", () => {
    it("returns the declared range", () => {
      setProject({ dependencies: { zod: "^4.4.3" } });
      expect(getDeclaredDependencyVersion("zod")).toBe("^4.4.3");
    });

    it("checks devDependencies, peerDependencies and optionalDependencies", () => {
      setProject({ devDependencies: { zod: "~3.24.2" } });
      expect(getDeclaredDependencyVersion("zod")).toBe("~3.24.2");

      setProject({ peerDependencies: { zod: "3.24.2" } });
      expect(getDeclaredDependencyVersion("zod")).toBe("3.24.2");

      setProject({ optionalDependencies: { zod: ">=3" } });
      expect(getDeclaredDependencyVersion("zod")).toBe(">=3");
    });

    it("returns null when not declared", () => {
      setProject({ dependencies: { express: "^4.0.0" } });
      expect(getDeclaredDependencyVersion("zod")).toBeNull();
    });
  });

  describe("assertRequiredPackageVersion", () => {
    it("is a no-op when zod is not declared", () => {
      setProject({ dependencies: {} }, "zod");
      expect(() => assertRequiredPackageVersion()).not.toThrow();
    });

    it("is a no-op when the resolver is not zod/hybrid", () => {
      setProject({ dependencies: { zod: "^3.24.2" } }, "class-validator");
      expect(() => assertRequiredPackageVersion()).not.toThrow();

      setProject({ dependencies: { zod: "^3.24.2" } });
      expect(() => assertRequiredPackageVersion()).not.toThrow();
    });

    it("does not throw for zod 4 with the zod resolver", () => {
      setProject({ dependencies: { zod: `^${SUPPORTED_ZOD_MAJOR}.0.0` } }, "zod");
      expect(() => assertRequiredPackageVersion()).not.toThrow();
    });

    it("throws for zod 3 with the zod resolver", () => {
      setProject({ dependencies: { zod: "^3.24.2" } }, "zod");
      expect(() => assertRequiredPackageVersion()).toThrow(
        "Unsupported zod version. Arkos 1.8+ requires at least zod 4, please install zod 4 instead."
      );
    });

    it("throws for zod 3 with the hybrid resolver", () => {
      setProject({ dependencies: { zod: "~3.24.2" } }, "hybrid");
      expect(() => assertRequiredPackageVersion()).toThrow(
        /requires at least zod 4/
      );
    });

    it("does not throw when the range has no parsable major", () => {
      setProject({ dependencies: { zod: "latest" } }, "zod");
      expect(() => assertRequiredPackageVersion()).not.toThrow();
    });
  });
});
