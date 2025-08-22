import serviceHooksManager from "../service-hooks-manager";

// Mock interfaces for testing
interface User {
  id: number;
  email: string;
  role: string;
}

interface ServiceBaseContext {
  user?: User;
  accessToken?: string;
}

// Mock service hooks for testing
const createMockHook = (_: string, delay: number = 0) => {
  return jest.fn(async (_: Record<string, any>) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return Promise.resolve();
  });
};

describe("ServiceHooksManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleHook", () => {
    it("should handle a single hook function", async () => {
      const mockHook = createMockHook("single-hook");
      const hooksArgs = { data: { name: "test" }, context: { userId: 1 } };

      await serviceHooksManager.handleHook(mockHook, hooksArgs);

      expect(mockHook).toHaveBeenCalledTimes(1);
      expect(mockHook).toHaveBeenCalledWith(hooksArgs);
    });

    it("should handle multiple hooks in an array", async () => {
      const mockHook1 = createMockHook("hook-1");
      const mockHook2 = createMockHook("hook-2");
      const mockHook3 = createMockHook("hook-3");
      const hooksArray = [mockHook1, mockHook2, mockHook3];
      const hooksArgs = { data: { name: "test" }, context: { userId: 1 } };

      await serviceHooksManager.handleHook(hooksArray, hooksArgs);

      expect(mockHook1).toHaveBeenCalledTimes(1);
      expect(mockHook2).toHaveBeenCalledTimes(1);
      expect(mockHook3).toHaveBeenCalledTimes(1);
      expect(mockHook1).toHaveBeenCalledWith(hooksArgs);
      expect(mockHook2).toHaveBeenCalledWith(hooksArgs);
      expect(mockHook3).toHaveBeenCalledWith(hooksArgs);
    });

    it("should execute hooks in the correct order", async () => {
      const executionOrder: string[] = [];
      const mockHook1 = jest.fn(async () => {
        executionOrder.push("hook1");
      });
      const mockHook2 = jest.fn(async () => {
        executionOrder.push("hook2");
      });
      const mockHook3 = jest.fn(async () => {
        executionOrder.push("hook3");
      });

      const hooksArray = [mockHook1, mockHook2, mockHook3];
      const hooksArgs = { test: "data" };

      await serviceHooksManager.handleHook(hooksArray, hooksArgs);

      expect(executionOrder).toEqual(["hook1", "hook2", "hook3"]);
    });

    it("should wait for all async hooks to complete", async () => {
      const mockHook1 = createMockHook("hook-1", 50);
      const mockHook2 = createMockHook("hook-2", 100);
      const mockHook3 = createMockHook("hook-3", 25);

      const hooksArray = [mockHook1, mockHook2, mockHook3];
      const hooksArgs = { test: "data" };

      const promise = serviceHooksManager.handleHook(hooksArray, hooksArgs);

      jest.useFakeTimers({ advanceTimers: 1000 });

      await promise;

      expect(mockHook1).toHaveBeenCalledTimes(1);
      expect(mockHook2).toHaveBeenCalledTimes(1);
      expect(mockHook3).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it("should handle empty array", async () => {
      const emptyHooksArray: any[] = [];
      const hooksArgs = { test: "data" };

      await expect(
        serviceHooksManager.handleHook(emptyHooksArray, hooksArgs)
      ).resolves.not.toThrow();
    });

    it("should pass correct arguments to each hook", async () => {
      const mockHook1 = createMockHook("hook-1");
      const mockHook2 = createMockHook("hook-2");
      const complexArgs = {
        data: { id: 1, name: "test", nested: { value: "nested" } },
        queryOptions: { include: { relations: true } },
        context: {
          user: { id: 1, email: "test@example.com", role: "admin" },
          accessToken: "jwt-token-123",
        },
        filters: { active: true },
      };

      await serviceHooksManager.handleHook([mockHook1, mockHook2], complexArgs);

      expect(mockHook1).toHaveBeenCalledWith(complexArgs);
      expect(mockHook2).toHaveBeenCalledWith(complexArgs);
    });

    it("should handle hooks that throw errors gracefully", async () => {
      const mockHook1 = createMockHook("hook-1");
      const errorHook = jest.fn(async () => {
        throw new Error("Hook error");
      });
      const mockHook3 = createMockHook("hook-3");

      const hooksArray = [mockHook1, errorHook, mockHook3];
      const hooksArgs = { test: "data" };

      await expect(
        serviceHooksManager.handleHook(hooksArray, hooksArgs)
      ).rejects.toThrow("Hook error");

      expect(mockHook1).toHaveBeenCalledTimes(1);
      expect(errorHook).toHaveBeenCalledTimes(1);
      expect(mockHook3).not.toHaveBeenCalled();
    });
  });

  describe("validateServiceHook", () => {
    it("should not throw for valid function hook", () => {
      const validHook = jest.fn(async () => {});

      expect(() => {
        serviceHooksManager.validateServiceHook(validHook);
      }).not.toThrow();
    });

    it("should throw error for non-function hook - string", () => {
      const invalidHook = "not a function" as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type string"
      );
    });

    it("should throw error for non-function hook - object", () => {
      const invalidHook = { someProperty: "value" } as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type object"
      );
    });

    it("should throw error for non-function hook - number", () => {
      const invalidHook = 123 as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type number"
      );
    });

    it("should throw error for non-function hook - null", () => {
      const invalidHook = null as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type object"
      );
    });

    it("should throw error for non-function hook - undefined", () => {
      const invalidHook = undefined as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type undefined"
      );
    });

    it("should throw error for non-function hook - array", () => {
      const invalidHook = ["not", "functions"] as any;

      expect(() => {
        serviceHooksManager.validateServiceHook(invalidHook);
      }).toThrow(
        "Validation Error: service hook must be of type function or array of functions but received value of type object"
      );
    });
  });

  describe("context handling", () => {
    it("should handle ServiceBaseContext with user and accessToken", async () => {
      const contextHook = jest.fn(async ({ context }: Record<string, any>) => {
        expect(context.user).toBeDefined();
        expect(context.accessToken).toBeDefined();
        return Promise.resolve();
      });

      const serviceContext: ServiceBaseContext = {
        user: { id: 123, email: "user@example.com", role: "user" },
        accessToken: "bearer-token-xyz",
      };

      const hooksArgs = {
        data: { name: "test" },
        context: serviceContext,
      };

      await serviceHooksManager.handleHook(contextHook, hooksArgs);

      expect(contextHook).toHaveBeenCalledWith(hooksArgs);
      expect(contextHook).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            user: expect.objectContaining({
              id: 123,
              email: "user@example.com",
              role: "user",
            }),
            accessToken: "bearer-token-xyz",
          }),
        })
      );
    });

    it("should handle ServiceBaseContext with only user", async () => {
      const contextHook = jest.fn(async ({ context }: Record<string, any>) => {
        expect(context.user).toBeDefined();
        expect(context.accessToken).toBeUndefined();
        return Promise.resolve();
      });

      const serviceContext: ServiceBaseContext = {
        user: { id: 456, email: "admin@example.com", role: "admin" },
      };

      const hooksArgs = {
        data: { name: "test" },
        context: serviceContext,
      };

      await serviceHooksManager.handleHook(contextHook, hooksArgs);

      expect(contextHook).toHaveBeenCalledWith(hooksArgs);
    });

    it("should handle ServiceBaseContext with only accessToken", async () => {
      const contextHook = jest.fn(async ({ context }: Record<string, any>) => {
        expect(context.user).toBeUndefined();
        expect(context.accessToken).toBeDefined();
        return Promise.resolve();
      });

      const serviceContext: ServiceBaseContext = {
        accessToken: "api-key-token",
      };

      const hooksArgs = {
        data: { name: "test" },
        context: serviceContext,
      };

      await serviceHooksManager.handleHook(contextHook, hooksArgs);

      expect(contextHook).toHaveBeenCalledWith(hooksArgs);
    });

    it("should handle empty ServiceBaseContext", async () => {
      const contextHook = jest.fn(async ({ context }: Record<string, any>) => {
        expect(context.user).toBeUndefined();
        expect(context.accessToken).toBeUndefined();
        return Promise.resolve();
      });

      const serviceContext: ServiceBaseContext = {};

      const hooksArgs = {
        data: { name: "test" },
        context: serviceContext,
      };

      await serviceHooksManager.handleHook(contextHook, hooksArgs);

      expect(contextHook).toHaveBeenCalledWith(hooksArgs);
    });

    it("should handle custom context transformation - adding tenant info", async () => {
      interface CustomServiceContext extends ServiceBaseContext {
        tenantId?: string;
        permissions?: string[];
        metadata?: Record<string, any>;
      }

      const customContextHook = jest.fn(
        async ({ context }: Record<string, any>) => {
          // Custom context transformation logic
          if (context.user && !context.tenantId) {
            context.tenantId = `tenant-${context.user.id}`;
          }

          if (context.user?.role === "admin" && !context.permissions) {
            context.permissions = ["read", "write", "delete"];
          }

          return Promise.resolve();
        }
      );

      const customContext: CustomServiceContext = {
        user: { id: 789, email: "admin@company.com", role: "admin" },
        accessToken: "custom-token",
        metadata: { source: "api", version: "1.0" },
      };

      const hooksArgs = {
        data: { name: "test" },
        context: customContext,
      };

      await serviceHooksManager.handleHook(customContextHook, hooksArgs);

      expect(customContextHook).toHaveBeenCalledWith(hooksArgs);
      expect(customContext.tenantId).toBe("tenant-789");
      expect(customContext.permissions).toEqual(["read", "write", "delete"]);
    });

    it("should handle custom context transformation - request tracking", async () => {
      interface TrackedServiceContext extends ServiceBaseContext {
        requestId?: string;
        timestamp?: Date;
        userAgent?: string;
        ipAddress?: string;
      }

      const trackingHook = jest.fn(async ({ context }: Record<string, any>) => {
        context.timestamp = new Date();
        context.requestId = `req-${Date.now()}`;
        return Promise.resolve();
      });

      const trackedContext: TrackedServiceContext = {
        user: { id: 101, email: "user@test.com", role: "user" },
        accessToken: "tracking-token",
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
      };

      const hooksArgs = {
        data: { action: "create" },
        context: trackedContext,
      };

      await serviceHooksManager.handleHook(trackingHook, hooksArgs);

      expect(trackingHook).toHaveBeenCalledWith(hooksArgs);
      expect(trackedContext.timestamp).toBeInstanceOf(Date);
      expect(trackedContext.requestId).toMatch(/^req-\d+$/);
    });

    it("should handle context transformation across multiple hooks", async () => {
      interface EnhancedServiceContext extends ServiceBaseContext {
        enrichedData?: any;
        validationPassed?: boolean;
        auditLog?: string[];
      }

      const validationHook = jest.fn(
        async ({ data, context }: Record<string, any>) => {
          context.validationPassed = data.name && data.name.length > 0;
          context.auditLog = context.auditLog || [];
          context.auditLog.push(
            `Validation: ${context.validationPassed ? "PASSED" : "FAILED"}`
          );
          return Promise.resolve();
        }
      );

      const enrichmentHook = jest.fn(
        async ({ data, context }: Record<string, any>) => {
          if (context.validationPassed) {
            context.enrichedData = {
              ...data,
              createdBy: context.user?.id,
              createdAt: new Date().toISOString(),
            };
          }
          context.auditLog = context.auditLog || [];
          context.auditLog.push("Enrichment: COMPLETED");
          return Promise.resolve();
        }
      );

      const auditHook = jest.fn(async ({ context }: Record<string, any>) => {
        context.auditLog = context.auditLog || [];
        context.auditLog.push(
          `Final audit: User ${context.user?.id} action logged`
        );
        return Promise.resolve();
      });

      const enhancedContext: EnhancedServiceContext = {
        user: { id: 202, email: "enhanced@test.com", role: "user" },
        accessToken: "enhanced-token",
      };

      const hooksArgs = {
        data: { name: "Test Product" },
        context: enhancedContext,
      };

      await serviceHooksManager.handleHook(
        [validationHook, enrichmentHook, auditHook],
        hooksArgs
      );

      expect(validationHook).toHaveBeenCalledWith(hooksArgs);
      expect(enrichmentHook).toHaveBeenCalledWith(hooksArgs);
      expect(auditHook).toHaveBeenCalledWith(hooksArgs);

      expect(enhancedContext.validationPassed).toBe(true);
      expect(enhancedContext.enrichedData).toEqual({
        name: "Test Product",
        createdBy: 202,
        createdAt: expect.any(String),
      });
      expect(enhancedContext.auditLog).toEqual([
        "Validation: PASSED",
        "Enrichment: COMPLETED",
        "Final audit: User 202 action logged",
      ]);
    });
  });

  describe("integration scenarios", () => {
    it("should handle real-world BaseService hook scenario - beforeCreateOne", async () => {
      const beforeCreateOneHook = jest.fn(
        async ({ data, context }: Record<string, any>) => {
          // Simulate adding user ID from context
          if (context?.user?.id) {
            data.createdBy = context.user.id;
          }
          // Simulate validation
          if (!data.name) {
            throw new Error("Name is required");
          }
        }
      );

      const hooksArgs = {
        data: { name: "Test Product" } as any,
        queryOptions: { include: { category: true } },
        context: {
          user: { id: 123, email: "user@example.com", role: "user" },
          accessToken: "jwt-token-123",
        },
      };

      await serviceHooksManager.handleHook(beforeCreateOneHook, hooksArgs);

      expect(beforeCreateOneHook).toHaveBeenCalledWith(hooksArgs);
      expect(hooksArgs.data.createdBy).toBe(123);
    });

    it("should handle real-world BaseService hook scenario - afterFindMany with access control", async () => {
      const afterFindManyHook1 = jest.fn(
        async ({ result, context }: Record<string, any>) => {
          // Simulate data filtering based on user role
          if (context?.user?.role !== "admin") {
            result.forEach((item: any) => {
              delete item.sensitiveData;
            });
          }
        }
      );

      const afterFindManyHook2 = jest.fn(
        async ({ result, context }: Record<string, any>) => {
          // Simulate data transformation
          result.forEach((item: any) => {
            item.displayName = `${item.firstName} ${item.lastName}`;
            item.accessLevel = context?.user?.role || "guest";
          });
        }
      );

      const hooksArgs = {
        result: [
          {
            id: 1,
            firstName: "John",
            lastName: "Doe",
            sensitiveData: "secret",
          },
          {
            id: 2,
            firstName: "Jane",
            lastName: "Smith",
            sensitiveData: "confidential",
          },
        ],
        filters: { active: true },
        queryOptions: {},
        context: {
          user: { id: 456, email: "user@example.com", role: "user" },
          accessToken: "user-token",
        },
      } as any;

      await serviceHooksManager.handleHook(
        [afterFindManyHook1, afterFindManyHook2],
        hooksArgs
      );

      expect(afterFindManyHook1).toHaveBeenCalledWith(hooksArgs);
      expect(afterFindManyHook2).toHaveBeenCalledWith(hooksArgs);
      expect(hooksArgs.result[0].sensitiveData).toBeUndefined(); // Removed for non-admin
      expect(hooksArgs.result[1].sensitiveData).toBeUndefined();
      expect(hooksArgs.result[0].displayName).toBe("John Doe");
      expect(hooksArgs.result[1].displayName).toBe("Jane Smith");
      expect(hooksArgs.result[0].accessLevel).toBe("user");
    });

    it("should handle admin user with full access", async () => {
      const adminHook = jest.fn(
        async ({ result, context }: Record<string, any>) => {
          // Admin users keep sensitive data
          if (context?.user?.role === "admin") {
            result.forEach((item: any) => {
              item.adminOnly = true;
            });
          }
        }
      );

      const hooksArgs = {
        result: [{ id: 1, sensitiveData: "admin-secret" }],
        context: {
          user: { id: 1, email: "admin@example.com", role: "admin" },
          accessToken: "admin-token",
        },
      } as any;

      await serviceHooksManager.handleHook(adminHook, hooksArgs);

      expect(hooksArgs.result[0].sensitiveData).toBe("admin-secret"); // Kept for admin
      expect(hooksArgs.result[0].adminOnly).toBe(true);
    });
  });
});
