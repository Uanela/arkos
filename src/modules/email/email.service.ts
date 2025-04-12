import nodemailer, { Transporter } from "nodemailer";
import { convert } from "html-to-text";
import { getArkosConfig } from "../../server";
import AppError from "../error-handler/utils/app-error";

/**
 * Defines the options for sending an email.
 */
export type EmailOptions = {
  from?: string; // Sender's email address (optional).
  to: string | string[]; // Recipient's email address or an array of email addresses.
  subject: string; // Subject of the email.
  text?: string; // Plain text body of the email (optional).
  html: string; // HTML body of the email.
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
   * Gets the email configuration, either from constructor-provided config or ArkosConfig
   * @returns Configuration object with host, port, and auth details
   * @throws AppError if email configuration is not set
   */
  private getEmailConfig(): SMTPConnectionOptions {
    // If custom config was provided through constructor, use it
    if (this.customConfig) {
      return this.customConfig;
    }

    // Otherwise, get from Arkos config
    const { email: emailConfigs } = getArkosConfig();

    if (!emailConfigs) {
      throw new AppError(
        "You are trying to use emailService without setting arkosConfig.email configurations",
        500,
        {
          docs: "Read more about emailService at https://www.arkosjs.com/docs/core-concepts/sending-emails",
        }
      );
    }

    return {
      host: emailConfigs.host,
      port: emailConfigs.port || 465,
      secure: emailConfigs.secure !== undefined ? emailConfigs.secure : true,
      auth: {
        user: emailConfigs.auth?.user,
        pass: emailConfigs.auth?.pass,
      },
      name: emailConfigs.name,
    };
  }

  /**
   * Gets or creates a transporter using provided config or default config
   * @param customConfig Optional override connection settings
   * @returns A configured nodemailer transporter
   */
  private getTransporter(customConfig?: SMTPConnectionOptions): Transporter {
    if (customConfig) {
      // Create temporary transporter with custom settings
      const defaultConfig = this.getEmailConfig();
      return nodemailer.createTransport({
        host: customConfig.host || defaultConfig.host,
        port: customConfig.port || defaultConfig.port,
        secure:
          customConfig.secure !== undefined
            ? customConfig.secure
            : defaultConfig.secure,
        auth: customConfig.auth || defaultConfig.auth,
      });
    }

    // Use cached transporter or create new one with default settings
    if (!this.transporter) {
      const config = this.getEmailConfig();
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      });
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
   * @returns {Promise<{ success: boolean; messageId?: string }>} Result with message ID on success.
   */
  public async send(
    options: EmailOptions,
    connectionOptions?: SMTPConnectionOptions,
    skipVerification = false
  ): Promise<{ success: boolean; messageId?: string }> {
    const config = this.getEmailConfig();
    const transporter = connectionOptions
      ? this.getTransporter(connectionOptions)
      : this.getTransporter();

    // Determine from address with proper fallbacks
    const fromAddress =
      options.from || connectionOptions?.auth?.user || config.auth?.user;

    // Optionally verify connection
    if (connectionOptions || !skipVerification) {
      const isConnected = await this.verifyConnection(transporter);

      if (!isConnected) {
        throw new Error("Failed to connect to email server");
      }
    }

    // Send the email
    const info = await transporter.sendMail({
      ...options,
      from: fromAddress,
      text: options?.text || convert(options.html),
    });

    return { success: true, messageId: info.messageId };
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

// Create default instance
const emailService = new EmailService();
export default emailService;
