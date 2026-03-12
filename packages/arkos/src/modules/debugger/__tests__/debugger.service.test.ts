import debuggerService from "../debugger.service";
import sheu from "../../../utils/sheu";
import { getArkosConfig } from "../../../server";
import { crd } from "../../../utils/helpers/fs.helpers";

// Mock dependencies
jest.mock("../../../utils/sheu");
jest.mock("../../../server");
jest.mock("../../../utils/helpers/fs.helpers");
jest.mock("util");
jest.mock("fs");

const mockSheu = {
  debug: jest.fn(),
  bold: jest.fn((text) => `**${text}**`),
  print: jest.fn(),
};

const mockCrd = jest.fn();

describe("DebuggerService", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (sheu as any) = mockSheu;
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
