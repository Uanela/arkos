import debuggerService from "../debugger.service";
import sheu from "../../../utils/sheu";
import { getArkosConfig } from "../../../server";
import loadedComponentsLogger from "../utils/loaded-components-logger";
import { crd } from "../../../utils/helpers/fs.helpers";
import util from "util";

// Mock dependencies
jest.mock("../../../utils/sheu");
jest.mock("../../../server");
jest.mock("../utils/loaded-components-logger");
jest.mock("../../../utils/helpers/fs.helpers");
jest.mock("util");
jest.mock("fs");

const mockSheu = {
  debug: jest.fn(),
  bold: jest.fn((text) => `**${text}**`),
  print: jest.fn(),
};

const mockLoadedComponentsLogger = {
  getComponentsNameList: jest.fn(),
  getLogText: jest.fn(),
};

const mockCrd = jest.fn();

describe("DebuggerService", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (sheu as any) = mockSheu;
    (loadedComponentsLogger as any) = mockLoadedComponentsLogger;
    (crd as any) = mockCrd.mockReturnValue("/root/project");

    mockReq = {
      modelName: "User",
      params: { id: "123" },
      body: { name: "John" },
      query: { page: "1" },
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe("logModuleFinalRouter", () => {
    it("should not log when debug level is less than 3", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 2 } },
      });

      const mockRouter = { stack: [] };
      debuggerService.logModuleFinalRouter("users", mockRouter as any);

      expect(sheu.debug).not.toHaveBeenCalled();
      expect(sheu.print).not.toHaveBeenCalled();
    });

    it("should not log when module name does not match filter", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: {
          dynamicLoader: {
            level: 3,
            filters: { modules: ["auth", "payment"] },
          },
        },
      });

      const mockRouter = { stack: [] };
      debuggerService.logModuleFinalRouter("users", mockRouter as any);

      expect(sheu.debug).not.toHaveBeenCalled();
      expect(sheu.print).not.toHaveBeenCalled();
    });

    it("should log when debug level is 3 and module matches filter", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: {
          dynamicLoader: {
            level: 3,
            filters: { modules: ["users"] },
          },
        },
      });

      (util.inspect as unknown as jest.Mock).mockReturnValue(
        "router structure"
      );
      const mockRouter = { stack: [] };

      debuggerService.logModuleFinalRouter("users", mockRouter as any);

      expect(sheu.debug).toHaveBeenCalledWith("**Final Router Module:** users");
      expect(sheu.print).toHaveBeenCalledWith("router structure");
      expect(util.inspect).toHaveBeenCalledWith(mockRouter, {
        depth: 2,
        colors: true,
      });
    });

    it("should log when no module filters are provided", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 3, filters: {} } },
      });

      (util.inspect as unknown as jest.Mock).mockReturnValue(
        "router structure"
      );
      const mockRouter = { stack: [] };

      debuggerService.logModuleFinalRouter("users", mockRouter as any);

      expect(sheu.debug).toHaveBeenCalledWith("**Final Router Module:** users");
      expect(sheu.print).toHaveBeenCalledWith("router structure");
    });
  });

  describe("logDynamicLoadedModulesComponents", () => {
    const mockAppModules: any = [
      {
        moduleName: "users",
        moduleDir: "/root/project/src/modules/users",
        components: { router: "router data" },
      },
      {
        moduleName: "auth",
        moduleDir: "/root/project/src/modules/auth",
        components: { authConfigs: "auth data" },
      },
    ];

    beforeEach(() => {
      mockLoadedComponentsLogger.getComponentsNameList.mockReturnValue([
        "users.router.ts",
      ]);
      mockLoadedComponentsLogger.getLogText.mockReturnValue(
        "detailed log text"
      );
    });

    it("should not log when debug level is less than 1", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 0 } },
      });

      debuggerService.logDynamicLoadedModulesComponents(mockAppModules);

      expect(sheu.debug).not.toHaveBeenCalled();
      expect(sheu.print).not.toHaveBeenCalled();
    });

    it("should log basic info when debug level is 1", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 1, filters: {} } },
      });

      debuggerService.logDynamicLoadedModulesComponents(mockAppModules);

      expect(sheu.debug).toHaveBeenCalledWith("**Dynamic Loader Components**", {
        timestamp: true,
      });
      expect(sheu.print).toHaveBeenCalledTimes(2);
      expect(mockLoadedComponentsLogger.getLogText).not.toHaveBeenCalled();
    });

    it("should log detailed info when debug level is 2 or higher", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 2, filters: {} } },
      });

      debuggerService.logDynamicLoadedModulesComponents(mockAppModules);

      expect(sheu.debug).toHaveBeenCalledWith("**Dynamic Loader Components**", {
        timestamp: true,
      });
      expect(sheu.print).toHaveBeenCalledTimes(2);
      expect(mockLoadedComponentsLogger.getLogText).toHaveBeenCalledTimes(2);
    });

    it("should filter modules based on module name filter", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: {
          dynamicLoader: {
            level: 1,
            filters: { modules: ["users"] },
          },
        },
      });

      debuggerService.logDynamicLoadedModulesComponents(mockAppModules);

      expect(sheu.print).toHaveBeenCalledTimes(1);
      expect(sheu.print).toHaveBeenCalledWith(
        expect.stringContaining("**Module:** users")
      );
    });

    it("should handle empty module name filter", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: {
          dynamicLoader: {
            level: 1,
            filters: { modules: [""] },
          },
        },
      });

      debuggerService.logDynamicLoadedModulesComponents(mockAppModules);

      expect(sheu.print).toHaveBeenCalledTimes(2);
    });

    it("should format module path correctly", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { dynamicLoader: { level: 1, filters: {} } },
      });

      debuggerService.logDynamicLoadedModulesComponents([mockAppModules[0]]);

      expect(sheu.print).toHaveBeenCalledWith(
        expect.stringContaining("/src/modules/users")
      );
    });
  });

  describe("handleTransformedQueryLog", () => {
    it("should not log when debug level is less than 2", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 1 } },
      });

      debuggerService.handleTransformedQueryLog({ search: "test" });

      expect(sheu.debug).not.toHaveBeenCalled();
    });

    it("should log transformed query when present and debug level is 2", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const transformedQuery = { where: { name: "John" } };
      debuggerService.handleTransformedQueryLog(transformedQuery);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Transformed Request Parameters\n${JSON.stringify(transformedQuery, null, 2)}`,
        { timestamp: true }
      );
    });

    it("should log empty message when transformed query is empty", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      debuggerService.handleTransformedQueryLog({});

      expect(sheu.debug).toHaveBeenCalledWith(
        "Transformed Request Parameters - Empty",
        { timestamp: true }
      );
    });
  });

  describe("logRequestInfo", () => {
    it("should call next immediately when debug level is less than 2", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 1 } },
      });

      debuggerService.logRequestInfo(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(sheu.debug).not.toHaveBeenCalled();
    });

    it("should log model name when present", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      debuggerService.logRequestInfo(mockReq, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith("Prisma Model Module\nUser", {
        timestamp: true,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not log model name when not present", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const reqWithoutModel = { ...mockReq, modelName: undefined };
      debuggerService.logRequestInfo(reqWithoutModel, mockRes, mockNext);

      expect(sheu.debug).not.toHaveBeenCalledWith(
        expect.stringContaining("Prisma Model Module"),
        { timestamp: true }
      );
    });

    it("should log request params when present", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      debuggerService.logRequestInfo(mockReq, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Original Request Params (req.params)\n${JSON.stringify(mockReq.params, null, 2)}`,
        { timestamp: true }
      );
    });

    it("should log empty params message when no params", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const reqWithoutParams = { ...mockReq, params: {} };
      debuggerService.logRequestInfo(reqWithoutParams, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Params (req.params) - Empty",
        { timestamp: true }
      );
    });

    it("should log request body when present", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      debuggerService.logRequestInfo(mockReq, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Original Request Body (req.body)\n${JSON.stringify(mockReq.body, null, 2)}`,
        { timestamp: true }
      );
    });

    it("should log empty body message when no body", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const reqWithoutBody = { ...mockReq, body: {} };
      debuggerService.logRequestInfo(reqWithoutBody, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Body (req.body) - Empty",
        { timestamp: true }
      );
    });

    it("should log request query when present", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      debuggerService.logRequestInfo(mockReq, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Original Request Query (req.query)\n${JSON.stringify(mockReq.query, null, 2)}`,
        { timestamp: true }
      );
    });

    it("should log empty query message when no query", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const reqWithoutQuery = { ...mockReq, query: {} };
      debuggerService.logRequestInfo(reqWithoutQuery, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Query (req.query) - Empty",
        { timestamp: true }
      );
    });

    it("should handle request with no data at all", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        debugging: { requests: { level: 2 } },
      });

      const emptyReq = {
        modelName: undefined,
        params: {},
        body: {},
        query: {},
      };
      debuggerService.logRequestInfo(emptyReq as any, mockRes, mockNext);

      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Params (req.params) - Empty",
        { timestamp: true }
      );
      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Body (req.body) - Empty",
        { timestamp: true }
      );
      expect(sheu.debug).toHaveBeenCalledWith(
        "Original Request Query (req.query) - Empty",
        { timestamp: true }
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
