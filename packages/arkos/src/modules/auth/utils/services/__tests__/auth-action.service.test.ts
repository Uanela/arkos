import { getArkosConfig } from "../../../../../utils/helpers/arkos-config.helpers";
import authActionService from "../auth-action.service";

jest.mock("fs");
jest.mock("../../../../../utils/helpers/arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(() => ({ authentication: { mode: "dynamic" } })),
}));
jest.mock("../../../../../utils/prisma/prisma-schema-parser");

describe("AuthActionService", () => {
  beforeEach(() => {
    // Clear the authActions array before each test
    authActionService.authActions = [];
  });

  describe("add", () => {
    it("should add a new auth action with basic parameters", () => {
      authActionService.add("Create", "user");

      expect(authActionService.authActions).toHaveLength(1);
      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should add multi-word Pascal case actions with roles", () => {
      (getArkosConfig as jest.Mock).mockReturnValueOnce({
        authentication: { mode: "static" },
      });
      authActionService.add("GenerateReport", "user");

      expect(authActionService.authActions).toHaveLength(1);
      expect(authActionService.authActions[0]).toEqual({
        roles: [],
        action: "GenerateReport",
        resource: "user",
        name: "Generate Report User",
        description: "Generate Report User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle complex Pascal case actions", () => {
      authActionService.add("DownloadExcelFile", "product");

      expect(authActionService.authActions).toHaveLength(1);
      expect(authActionService.authActions[0]).toEqual({
        action: "DownloadExcelFile",
        resource: "product",
        name: "Download Excel File Product",
        description: "Download Excel File Product",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should not add duplicate auth actions", () => {
      authActionService.add("Create", "user");
      authActionService.add("Create", "user"); // Duplicate

      expect(authActionService.authActions).toHaveLength(1);
    });

    it("should add different actions for the same resource", () => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");

      expect(authActionService.authActions).toHaveLength(2);
    });

    it("should add same action for different resources", () => {
      authActionService.add("Create", "user");
      authActionService.add("Create", "product");

      expect(authActionService.authActions).toHaveLength(2);
    });

    it("should handle accessControl as array", () => {
      const accessControl = ["admin", "manager"];
      authActionService.add("Create", "user", accessControl);

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle accessControl object with action rule as array", () => {
      const accessControl = {
        Create: ["admin", "manager"],
      };
      authActionService.add("Create", "user", accessControl);

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle accessControl object with detailed action rule", () => {
      const accessControl = {
        Create: {
          roles: ["admin"],
          name: "Create New User",
          description: "Allows creating new user accounts",
          errorMessage: "You do not have permission to create users",
        },
      };
      authActionService.add("Create", "user", accessControl);

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create New User",
        description: "Allows creating new user accounts",
        errorMessage: "You do not have permission to create users",
      });
    });

    it("should handle accessControl object with multiple action rules", () => {
      const accessControl = {
        Create: {
          roles: ["admin"],
          name: "Create New User",
          description: "Allows creating new user accounts",
        },
        Update: {
          roles: ["admin", "manager"],
          name: "Modify User",
          description: "Allows updating user information",
        },
      };

      authActionService.add("Create", "user", accessControl);
      authActionService.add("Update", "user", accessControl);

      expect(authActionService.authActions).toHaveLength(2);
      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create New User",
        description: "Allows creating new user accounts",
        errorMessage: "You do not have permission to perform this operation",
      });
      expect(authActionService.authActions[1]).toEqual({
        action: "Update",
        resource: "user",
        name: "Modify User",
        description: "Allows updating user information",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle accessControl object with non-matching action rule", () => {
      const accessControl = {
        Update: {
          roles: ["admin"],
          name: "Modify User",
        },
      };

      // Add action that doesn't match the accessControl rule
      authActionService.add("Create", "user", accessControl);

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });
  });

  describe("getAll", () => {
    it("should return all auth actions", () => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");
      authActionService.add("View", "product");

      const result = authActionService.getAll();

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          action: "Create",
          resource: "user",
          name: "Create User",
          description: "Create User",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "Update",
          resource: "user",
          name: "Update User",
          description: "Update User",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "View",
          resource: "product",
          name: "View Product",
          description: "View Product",
          errorMessage: "You do not have permission to perform this operation",
        },
      ]);
    });

    it("should return empty array when no auth actions exist", () => {
      const result = authActionService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("getOne", () => {
    beforeEach(() => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");
      authActionService.add("View", "product");
    });

    it("should return the correct auth action", () => {
      const result = authActionService.getOne("Create", "user");

      expect(result).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should return undefined for non-existent action", () => {
      const result = authActionService.getOne("Delete", "user");
      expect(result).toBeUndefined();
    });

    it("should return undefined for non-existent resource", () => {
      const result = authActionService.getOne("Create", "order");
      expect(result).toBeUndefined();
    });
  });

  describe("getUniqueActions", () => {
    it("should return unique actions", () => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");
      authActionService.add("Create", "product");
      authActionService.add("View", "product");
      authActionService.add("Create", "order"); // Duplicate action

      const result = authActionService.getUniqueActions();

      expect(result).toEqual(["Create", "Update", "View"]);
    });

    it("should return empty array when no auth actions exist", () => {
      const result = authActionService.getUniqueActions();
      expect(result).toEqual([]);
    });
  });

  describe("getUniqueResources", () => {
    it("should return unique resources", () => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");
      authActionService.add("Create", "product");
      authActionService.add("View", "product");
      authActionService.add("Create", "order");

      const result = authActionService.getUniqueResources();

      expect(result).toEqual(["user", "product", "order"]);
    });

    it("should return empty array when no auth actions exist", () => {
      const result = authActionService.getUniqueResources();
      expect(result).toEqual([]);
    });
  });

  describe("getByResource", () => {
    beforeEach(() => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "user");
      authActionService.add("View", "product");
      authActionService.add("Delete", "user");
    });

    it("should return all actions for a specific resource", () => {
      const result = authActionService.getByResource("user");

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          action: "Create",
          resource: "user",
          name: "Create User",
          description: "Create User",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "Update",
          resource: "user",
          name: "Update User",
          description: "Update User",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "Delete",
          resource: "user",
          name: "Delete User",
          description: "Delete User",
          errorMessage: "You do not have permission to perform this operation",
        },
      ]);
    });

    it("should return empty array for non-existent resource", () => {
      const result = authActionService.getByResource("nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("getByAction", () => {
    beforeEach(() => {
      authActionService.add("Create", "user");
      authActionService.add("Create", "product");
      authActionService.add("Create", "order");
      authActionService.add("Update", "user");
    });

    it("should return all resources for a specific action", () => {
      const result = authActionService.getByAction("Create");

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          action: "Create",
          resource: "user",
          name: "Create User",
          description: "Create User",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "Create",
          resource: "product",
          name: "Create Product",
          description: "Create Product",
          errorMessage: "You do not have permission to perform this operation",
        },
        {
          action: "Create",
          resource: "order",
          name: "Create Order",
          description: "Create Order",
          errorMessage: "You do not have permission to perform this operation",
        },
      ]);
    });

    it("should return empty array for non-existent action", () => {
      const result = authActionService.getByAction("Delete");
      expect(result).toEqual([]);
    });
  });

  describe("exists", () => {
    beforeEach(() => {
      authActionService.add("Create", "user");
      authActionService.add("Update", "product");
    });

    it("should return true for existing auth action", () => {
      const result = authActionService.exists("Create", "user");
      expect(result).toBe(true);
    });

    it("should return false for non-existent action", () => {
      const result = authActionService.exists("Delete", "user");
      expect(result).toBe(false);
    });

    it("should return false for non-existent resource", () => {
      const result = authActionService.exists("Create", "order");
      expect(result).toBe(false);
    });

    it("should return false when both action and resource do not exist", () => {
      const result = authActionService.exists("Delete", "order");
      expect(result).toBe(false);
    });
  });

  describe("transformAccessControlToValidAuthAction", () => {
    it("should handle empty accessControl", () => {
      authActionService.add("Create", "user", undefined);

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle accessControl with empty object", () => {
      authActionService.add("Create", "user", {});

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create User",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });

    it("should handle accessControl with data", () => {
      authActionService.add("Create", "user", {
        Create: { name: "Create a badass user", roles: ["Admin"] },
      });

      expect(authActionService.authActions[0]).toEqual({
        action: "Create",
        resource: "user",
        name: "Create a badass user",
        description: "Create User",
        errorMessage: "You do not have permission to perform this operation",
      });
    });
  });
});
