import { ArkosPolicy } from "..";

const mockPermissionFn = jest.fn().mockReturnValue(true);
const mockPermission = jest.fn().mockReturnValue(mockPermissionFn);

jest.mock("../../../modules/auth/auth.service", () => ({
  __esModule: true,
  default: {
    permission: (...args: any[]) => mockPermission(...args),
  },
}));

const user = { id: "1", role: "Admin" } as any;

describe("ArkosPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission.mockReturnValue(mockPermissionFn);
  });

  describe("factory", () => {
    it("should create policy with correct resource", () => {
      const policy = ArkosPolicy("user");
      expect(policy.resource).toBe("user");
    });

    it("should have __type ArkosPolicy", () => {
      const policy = ArkosPolicy("user");
      expect(policy.__type).toBe("ArkosPolicy");
    });

    it("should have rule method", () => {
      const policy = ArkosPolicy("user");
      expect(typeof policy.rule).toBe("function");
    });

    it("should not have any can* properties before rule() calls", () => {
      const policy = ArkosPolicy("user") as any;
      expect(policy.canCreate).toBeUndefined();
      expect(policy.Create).toBeUndefined();
    });
  });

  describe("rule()", () => {
    it("should return a new policy instance", () => {
      const policy = ArkosPolicy("user");
      const next = policy.rule("Create", ["Admin"]);
      expect(next).not.toBe(policy);
    });

    it("should preserve resource across rule() calls", () => {
      const policy = ArkosPolicy("user")
        .rule("Create", ["Admin"])
        .rule("View", "*");
      expect(policy.resource).toBe("user");
    });

    it("should preserve __type across rule() calls", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.__type).toBe("ArkosPolicy");
    });

    it("should preserve rule() method across calls", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(typeof policy.rule).toBe("function");
    });

    it("should accumulate multiple actions", () => {
      const policy = ArkosPolicy("user")
        .rule("Create", ["Admin"])
        .rule("View", "*")
        .rule("Delete", ["Admin"]) as any;

      expect(policy.Create).toBeDefined();
      expect(policy.View).toBeDefined();
      expect(policy.Delete).toBeDefined();
      expect(policy.canCreate).toBeDefined();
      expect(policy.canView).toBeDefined();
      expect(policy.canDelete).toBeDefined();
    });

    it("should not carry previous instance actions to new instance", () => {
      const policy = ArkosPolicy("user");
      const withCreate = policy.rule("Create", ["Admin"]) as any;
      expect((policy as any).canCreate).toBeUndefined();
      expect(withCreate.canCreate).toBeDefined();
    });
  });

  describe("Action entry (e.g. Create)", () => {
    it("should have correct resource", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.Create.resource).toBe("user");
    });

    it("should have correct action", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.Create.action).toBe("Create");
    });

    it("should have correct rule for string[]", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin", "Editor"]);
      expect(policy.Create.rule).toEqual(["Admin", "Editor"]);
    });

    it("should have correct rule for wildcard", () => {
      const policy = ArkosPolicy("user").rule("View", "*");
      expect(policy.View.rule).toBe("*");
    });

    it("should have correct rule for object", () => {
      const rule = { roles: ["Admin"] };
      const policy = ArkosPolicy("user").rule("Create", rule);
      expect(policy.Create.rule).toEqual(rule);
    });

    it("should be callable and call authService.permission", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      policy.Create(user);
      expect(mockPermission).toHaveBeenCalledWith("Create", "user", ["Admin"]);
      expect(mockPermissionFn).toHaveBeenCalledWith(user);
    });

    it("should return result of authService.permission", () => {
      mockPermissionFn.mockReturnValue(false);
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      const result = policy.Create(user);
      expect(result).toBe(false);
    });

    it("should be callable without user", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(() => policy.Create()).not.toThrow();
    });
  });

  describe("can{Action} entry (e.g. canCreate)", () => {
    it("should be same reference as Action entry", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.canCreate).toBe(policy.Create);
    });

    it("should have correct resource", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.canCreate.resource).toBe("user");
    });

    it("should have correct action", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(policy.canCreate.action).toBe("Create");
    });

    it("should be callable and call authService.permission", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      policy.canCreate(user);
      expect(mockPermission).toHaveBeenCalledWith("Create", "user", ["Admin"]);
      expect(mockPermissionFn).toHaveBeenCalledWith(user);
    });

    it("should return result of authService.permission", () => {
      mockPermissionFn.mockReturnValue(true);
      const policy = ArkosPolicy("user").rule("View", "*");
      const result = policy.canView(user);
      expect(result).toBe(true);
    });
  });

  describe("multiple resources", () => {
    it("should keep resources isolated", () => {
      const userPolicy = ArkosPolicy("user").rule("Create", ["Admin"]);
      const postPolicy = ArkosPolicy("post").rule("Create", ["Editor"]);

      expect(userPolicy.Create.resource).toBe("user");
      expect(postPolicy.Create.resource).toBe("post");
      expect(userPolicy.Create.rule).toEqual(["Admin"]);
      expect(postPolicy.Create.rule).toEqual(["Editor"]);
    });
  });

  describe("authService.permission integration", () => {
    it("should call permission once per invocation not per rule()", () => {
      const policy = ArkosPolicy("user").rule("Create", ["Admin"]);
      expect(mockPermission).not.toHaveBeenCalled();
      policy.canCreate(user);
      expect(mockPermission).toHaveBeenCalledTimes(1);
    });

    it("should pass correct args to authService.permission for each action", () => {
      const policy = ArkosPolicy("user")
        .rule("Create", ["Admin"])
        .rule("View", "*");

      policy.canCreate(user);
      expect(mockPermission).toHaveBeenCalledWith("Create", "user", ["Admin"]);

      policy.canView(user);
      expect(mockPermission).toHaveBeenCalledWith("View", "user", "*");
    });
  });
});
