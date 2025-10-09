import nodemailer from "nodemailer";
import {
  EmailService,
  EmailOptions,
  SMTPConnectionOptions,
} from "../email.service";
import { getArkosConfig } from "../../../server";
import AppError from "../../error-handler/utils/app-error";

const mockEmailConfig = {
  host: "smtp.example.com",
  port: 587,
  secure: true,
  auth: {
    user: "test@example.com",
    pass: "password123",
  },
  name: "Test Email Service",
};

// Mock dependencies
jest.mock("nodemailer");
jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(() => mockEmailConfig),
}));
jest.mock("html-to-text", () => ({
  convert: jest.fn((html) => `converted-${html}`),
}));
jest.mock("../../error-handler/utils/app-error");
jest.mock("fs");

describe("EmailService", () => {
  let emailService: EmailService;
  let mockTransporter: any;
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;

  // Sample email options
  const testEmailOptions: EmailOptions = {
    to: "recipient@example.com",
    subject: "Test Email",
    html: "<p>Hello World</p>",
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up mock for nodemailer transporter
    mockSendMail = jest
      .fn()
      .mockResolvedValue({ messageId: "test-message-id" });
    mockVerify = jest.fn().mockResolvedValue(true);
    mockTransporter = {
      sendMail: mockSendMail,
      verify: mockVerify,
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create a new instance of EmailService for each test
    emailService = new EmailService();
  });

  describe("constructor", () => {
    it("should not call getArkosConfig during instantiation", () => {
      expect(getArkosConfig).not.toHaveBeenCalled();
    });

    it("should accept custom configuration in constructor", () => {
      const customConfig: SMTPConnectionOptions = {
        host: "custom.smtp.server",
        port: 2525,
        secure: false,
        auth: {
          user: "custom@test.com",
          pass: "custompassword",
        },
      };

      const customEmailService = new EmailService(customConfig);

      // Call send to trigger using the custom config
      customEmailService.send(testEmailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: "custom.smtp.server",
        port: 2525,
        secure: false,
        auth: {
          user: "custom@test.com",
          pass: "custompassword",
        },
      });
    });
  });

  describe("getEmailConfig (private method tested indirectly)", () => {
    beforeEach(() => {
      // Clear environment variables before each test
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_SECURE;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      delete process.env.EMAIL_NAME;
    });

    it("should throw an AppError inside send() if email config is not set in both arkosConfig and env", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({ email: null });
      (AppError as any as jest.Mock).mockReturnValue(new Error());

      await expect(emailService.send(testEmailOptions)).rejects.toThrow();
      expect(AppError).toHaveBeenCalledWith(
        expect.stringContaining("without setting email configurations"),
        500,
        expect.any(Object)
      );
    });

    it("should return false from verifyConnection() if email config is not set in both arkosConfig and env", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({ email: null });
      console.error = jest.fn();

      const result = await emailService.verifyConnection();
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
      expect(AppError).toHaveBeenCalled();
    });

    it("should use environment variables as fallback when arkosConfig.email is not set", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({ email: null });

      process.env.EMAIL_HOST = "env.smtp.com";
      process.env.EMAIL_PORT = "587";
      process.env.EMAIL_SECURE = "false";
      process.env.EMAIL_USER = "env@test.com";
      process.env.EMAIL_PASSWORD = "envpass123";
      process.env.EMAIL_NAME = "Env Service";

      await emailService.verifyConnection();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "env.smtp.com",
          port: 587,
          secure: false,
          auth: {
            user: "env@test.com",
            pass: "envpass123",
          },
          name: "Env Service",
        })
      );
    });

    it("should prioritize arkosConfig over environment variables", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        email: {
          host: "config.smtp.com",
          port: 465,
          auth: {
            user: "config@test.com",
            pass: "configpass",
          },
        },
      });

      process.env.EMAIL_HOST = "env.smtp.com";
      process.env.EMAIL_USER = "env@test.com";
      process.env.EMAIL_PASSWORD = "envpass";

      await emailService.verifyConnection();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "config.smtp.com",
          auth: {
            user: "config@test.com",
            pass: "configpass",
          },
        })
      );
    });

    it("should use default values for port and secure if not provided in both sources", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        email: {
          host: "smtp.example.com",
          auth: {
            user: "test@example.com",
            pass: "password123",
          },
        },
      });

      await emailService.verifyConnection();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    it("should mix arkosConfig and env variables when some values are missing", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        email: {
          host: "config.smtp.com",
          // auth missing from config
        },
      });

      process.env.EMAIL_USER = "env@test.com";
      process.env.EMAIL_PASSWORD = "envpass";

      await emailService.verifyConnection();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "config.smtp.com",
          auth: {
            user: "env@test.com",
            pass: "envpass",
          },
        })
      );
    });

    it("should use custom config provided in constructor instead of Arkos config or env", async () => {
      const customConfig: SMTPConnectionOptions = {
        host: "constructor.smtp.com",
        port: 1234,
        auth: {
          user: "constructor@test.com",
          pass: "constructorpass",
        },
      };

      process.env.EMAIL_HOST = "env.smtp.com";
      process.env.EMAIL_USER = "env@test.com";
      process.env.EMAIL_PASSWORD = "envpass";

      const customEmailService = new EmailService(customConfig);
      await customEmailService.send(testEmailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "constructor.smtp.com",
          port: 1234,
          auth: {
            user: "constructor@test.com",
            pass: "constructorpass",
          },
        })
      );
      expect(getArkosConfig).not.toHaveBeenCalled();
    });
  });

  describe("verifyConnection", () => {
    it("should return true when connection is valid", async () => {
      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    it("should return false when connection verification fails", async () => {
      mockVerify.mockRejectedValue(new Error("Connection failed"));
      console.error = jest.fn(); // Silence console.error

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it("should use provided transporter if available", async () => {
      const customTransporter = {
        verify: jest.fn().mockResolvedValue(true),
      };

      await emailService.verifyConnection(customTransporter as any);

      expect(customTransporter.verify).toHaveBeenCalled();
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe("send", () => {
    it("should send an email with default configuration", async () => {
      const result = await emailService.send(testEmailOptions);

      expect(result).toEqual({
        success: true,
        messageId: "test-message-id",
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          subject: "Test Email",
          html: "<p>Hello World</p>",
          from: "env@test.com",
          text: "converted-<p>Hello World</p>",
        })
      );
    });

    it('should use provided "from" address if available', async () => {
      await emailService.send({
        ...testEmailOptions,
        from: "sender@example.com",
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "sender@example.com",
        })
      );
    });

    it("should use provided text if available instead of converting html", async () => {
      await emailService.send({
        ...testEmailOptions,
        text: "Plain text email",
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Plain text email",
        })
      );
    });

    it("should use custom connection options if provided", async () => {
      const customConnection: SMTPConnectionOptions = {
        host: "custom.smtp.com",
        port: 2525,
        secure: false,
        auth: {
          user: "custom@example.com",
          pass: "custompass",
        },
      };

      await emailService.send(testEmailOptions, customConnection);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "custom.smtp.com",
          port: 2525,
          secure: false,
          auth: {
            user: "custom@example.com",
            pass: "custompass",
          },
        })
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "custom@example.com",
        })
      );
    });

    it("should verify connection before sending when using custom connection options", async () => {
      const customConnection: SMTPConnectionOptions = {
        host: "custom.smtp.com",
      };

      await emailService.send(testEmailOptions, customConnection);

      expect(mockVerify).toHaveBeenCalled();
    });

    it("should throw error if connection verification fails with custom config", async () => {
      const spy = jest.spyOn(emailService, "verifyConnection");

      spy.mockResolvedValue(false);

      await expect(
        emailService.send(testEmailOptions, {
          host: "arkos.smtp.com",
        })
      ).rejects.toThrow("Failed to connect to email server");
    });

    it("should skip verification when skipVerification is true", async () => {
      await emailService.send(testEmailOptions, undefined, true);

      expect(mockVerify).not.toHaveBeenCalled();
    });

    it("should reuse transporter for multiple sends with default config", async () => {
      await emailService.send(testEmailOptions);
      await emailService.send(testEmailOptions);

      // Should only create transporter once
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });
  });

  describe("custom transporter caching", () => {
    it("should create a new transporter for each custom config", async () => {
      await emailService.send(testEmailOptions, {
        host: "smtp1.example.com",
      });

      await emailService.send(testEmailOptions, {
        host: "smtp2.example.com",
      });

      // Should create two different transporters
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
    });
  });

  // New tests for the added functionality
  describe("updateConfig", () => {
    it("should update the custom configuration and reset transporter", async () => {
      // First, use default config
      await emailService.send(testEmailOptions);
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);

      // Update config
      const newConfig: SMTPConnectionOptions = {
        host: "updated.smtp.com",
        port: 2525,
        auth: {
          user: "updated@example.com",
          pass: "updatedpass",
        },
      };

      emailService.updateConfig(newConfig);

      // Send email with updated config
      await emailService.send(testEmailOptions);

      // Should create a new transporter
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
      expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          host: "updated.smtp.com",
          port: 2525,
          auth: {
            user: "updated@example.com",
            pass: "updatedpass",
          },
        })
      );
    });
  });

  describe("static create", () => {
    it("should create a new EmailService instance with provided config", async () => {
      const staticConfig: SMTPConnectionOptions = {
        host: "static.smtp.com",
        port: 587,
        auth: {
          user: "static@example.com",
          pass: "staticpass",
        },
      };

      const staticEmailService = EmailService.create(staticConfig);

      // Send email to trigger using the config
      await staticEmailService.send(testEmailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "static.smtp.com",
          port: 587,
          auth: {
            user: "static@example.com",
            pass: "staticpass",
          },
        })
      );

      // Should not have used Arkos config
      expect(getArkosConfig).not.toHaveBeenCalled();
    });

    it("should create instances that work independently", async () => {
      const service1 = EmailService.create({
        host: "service1.smtp.com",
        auth: {
          user: "service1@example.com",
          pass: "service1pass",
        },
      });

      const service2 = EmailService.create({
        host: "service2.smtp.com",
        auth: {
          user: "service2@example.com",
          pass: "service2pass",
        },
      });

      await service1.send(testEmailOptions);
      await service2.send(testEmailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "service1.smtp.com",
          auth: {
            user: "service1@example.com",
            pass: "service1pass",
          },
        })
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "service2.smtp.com",
          auth: {
            user: "service2@example.com",
            pass: "service2pass",
          },
        })
      );
    });
  });
});
