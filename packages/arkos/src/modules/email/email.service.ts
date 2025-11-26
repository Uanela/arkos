import nodemailer, { Transporter } from "nodemailer";
import { convert } from "html-to-text";
import { getArkosConfig } from "../../server";
import AppError from "../error-handler/utils/app-error";

/**
 * Defines the options for sending an email.
 */
export type EmailOptions = {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html: string;
};

/**
 * Defines the authentication options for SMTP.
 */
export type SMTPAuthOptions = {
  user: string;
  pass: string;
};

/**
 * Defines the connection options for SMTP server.
 */
export type SMTPConnectionOptions = {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: SMTPAuthOptions;
  name?: string;
};

/**
 * A service class to handle email-related tasks, including sending emails.
 *
 * See the api reference [www.arkosjs.com/docs/api-reference/the-email-service-class](https://www.arkosjs.com/docs/api-reference/the-email-service-class)
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private customConfig: SMTPConnectionOptions | null = null;

  /**
   * Creates an instance of the EmailService class.
   *
   * @param {SMTPConnectionOptions} [config] - Optional custom SMTP configuration.
   * If provided, these settings will be used instead of the Arkos config.
   */
  constructor(config?: SMTPConnectionOptions) {
    if (config) {
      this.customConfig = config;
    }
  }

  /**
   * Gets the email configuration from multiple sources with priority:
   * 1. Constructor customConfig
   * 2. ArkosConfig
   * 3. Environment variables
   * @returns Configuration object with host, port, and auth details
   * @throws AppError if required email configuration is not set
   */
  private getEmailConfig(): SMTPConnectionOptions {
    if (this.customConfig) {
      return this.customConfig;
    }

    const { email: emailConfigs } = getArkosConfig();
    const host = emailConfigs?.host || process.env.EMAIL_HOST;
    const port =
      emailConfigs?.port ||
      (process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined);
    const secure =
      emailConfigs?.secure !== undefined
        ? emailConfigs.secure
        : process.env.EMAIL_SECURE
          ? process.env.EMAIL_SECURE === "true"
          : undefined;
    const user = emailConfigs?.auth?.user || process.env.EMAIL_USER;
    const pass = emailConfigs?.auth?.pass || process.env.EMAIL_PASSWORD;
    const name = emailConfigs?.name || process.env.EMAIL_NAME;

    if (!host || !user || !pass) {
      throw new AppError(
        "You are trying to use emailService without setting email configurations. " +
          "Please configure either arkosConfig.email or environment variables (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)",
        500,
        {
          docs: "Read more about emailService at https://www.arkosjs.com/docs/core-concepts/sending-emails",
        }
      );
    }

    return {
      host,
      port: port || 465,
      secure: secure !== undefined ? secure : true,
      auth: {
        user,
        pass,
      },
      name,
    };
  }

  /**
   * Gets or creates a transporter using the email configuration
   * @param customConfig Optional override connection settings (takes full priority if provided)
   * @returns A configured nodemailer transporter
   */
  private getTransporter(customConfig?: SMTPConnectionOptions): Transporter {
    if (customConfig) {
      const { name, ...config } = customConfig;
      return nodemailer.createTransport(config);
    }

    if (!this.transporter) {
      const { name, ...config } = this.getEmailConfig() || {};
      this.transporter = nodemailer.createTransport(config);
    }
    return this.transporter;
  }

  /**
   * Sends an email with the provided options.
   * Can use either the default configuration or custom connection options.
   *
   * @param {EmailOptions} options - The options for the email to be sent.
   * @param {SMTPConnectionOptions} [connectionOptions] - Optional custom connection settings.
   * @param {boolean} [skipVerification=false] - Whether to skip connection verification.
   * @returns {Promise<{ success: boolean; messageId?: string } & Record<string, any>>} Result with message ID on success.
   */
  public async send(
    options: EmailOptions,
    connectionOptions?: SMTPConnectionOptions,
    skipVerification: boolean = false
  ): Promise<{ success: boolean; messageId?: string } & Record<string, any>> {
    const config = this.getEmailConfig();
    const transporter = connectionOptions
      ? this.getTransporter(connectionOptions)
      : this.getTransporter();

    const fromAddress =
      options.from || connectionOptions?.auth?.user || config.auth?.user;

    if (connectionOptions || !skipVerification) {
      const isConnected = await this.verifyConnection(transporter);
      if (!isConnected) throw new Error("Failed to connect to email server");
    }

    const info = await transporter.sendMail({
      ...options,
      from: fromAddress,
      text: options?.text || convert(options.html),
    });

    return { success: true, ...info };
  }

  /**
   * Verifies the connection to the email server.
   * @param {Transporter} [transporterToVerify] - Optional transporter to verify.
   * @returns {Promise<boolean>} A promise that resolves to true if connection is valid.
   */
  public async verifyConnection(
    transporterToVerify?: Transporter
  ): Promise<boolean> {
    try {
      const transporter = transporterToVerify || this.getTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("Email Server Connection Failed", error);
      return false;
    }
  }

  /**
   * Updates the custom configuration for this email service instance.
   * @param {SMTPConnectionOptions} config - The new connection options.
   */
  public updateConfig(config: SMTPConnectionOptions): void {
    this.customConfig = config;
    this.transporter = null; // Reset transporter so it will be recreated with new config
  }

  /**
   * Creates a new instance of EmailService with custom configuration.
   * @param {SMTPConnectionOptions} config - The connection options for the new instance.
   * @returns {EmailService} A new EmailService instance.
   */
  public static create(config: SMTPConnectionOptions): EmailService {
    return new EmailService(config);
  }
}

const emailService = new EmailService();

export default emailService;
