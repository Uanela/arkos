import nodemailer, { Transporter } from "nodemailer";
import { BaseService } from "../base/base.service";
import { convert } from "html-to-text";

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
};

/**
 * A service class to handle email-related tasks, including sending emails.
 */
export class EmailService extends BaseService {
  private transporter: Transporter;
  private defaultHost: string;
  private defaultPort: number;
  private defaultAuth: SMTPAuthOptions;

  /**
   * Creates an instance of the EmailService class.
   *
   * @param {string} [host] - The SMTP host (defaults to the environment variable `EMAIL_HOST`).
   * @param {SMTPAuthOptions} [auth] - The authentication object containing `user` and `pass` for the email account.
   * @param {number} [port] - The SMTP port (defaults to 465).
   */
  constructor(
    host: string = process.env.EMAIL_HOST!,
    auth: SMTPAuthOptions = {
      user: process.env.EMAIL_FROM!,
      pass: process.env.EMAIL_PASSWORD!,
    },
    port: number = parseInt(process.env.EMAIL_PORT || "465")
  ) {
    super("email");
    this.defaultHost = host;
    this.defaultPort = port;
    this.defaultAuth = auth;

    // Initialize the default transporter
    this.transporter = nodemailer.createTransport({
      host: this.defaultHost,
      port: this.defaultPort,
      secure: true,
      auth: this.defaultAuth,
    });
  }

  /**
   * Verifies the connection to the email server.
   * @param {Transporter} [transporterToVerify] - Optional transporter to verify instead of the default one.
   * @returns {Promise<boolean>} A promise that resolves to true if connection is valid.
   */
  public async verifyConnection(
    transporterToVerify?: Transporter
  ): Promise<boolean> {
    try {
      const transporter = transporterToVerify || this.transporter;
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("Email Server Connection Failed", 500);
      return false;
    }
  }

  /**
   * Sends an email with the provided options.
   * Can use either the default configuration or custom connection options.
   *
   * @param {EmailOptions} options - The options for the email to be sent.
   * @param {SMTPConnectionOptions} [connectionOptions] - Optional custom connection settings.
   * @returns {Promise<{ success: boolean; messageId?: string; error?: any }>} A promise that resolves with the result of the email send attempt.
   * @throws {Error} Throws an error if the email sending fails.
   */
  public async send(
    options: EmailOptions,
    connectionOptions?: SMTPConnectionOptions
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      let transporter = this.transporter;
      let fromAddress = options?.from || process.env.EMAIL_FROM;

      // If custom connection options are provided, create a temporary transporter
      if (connectionOptions) {
        const tempTransporter = nodemailer.createTransport({
          host: connectionOptions.host || this.defaultHost,
          port: connectionOptions.port || this.defaultPort,
          secure:
            connectionOptions.secure !== undefined
              ? connectionOptions.secure
              : true,
          auth: connectionOptions.auth || this.defaultAuth,
        });

        // Verify the temporary connection
        await this.verifyConnection(tempTransporter);

        // Use the temporary transporter and update from address if auth user is provided
        transporter = tempTransporter;
        if (connectionOptions.auth?.user) {
          fromAddress = options?.from || connectionOptions.auth.user;
        }
      } else {
        // Verify the default connection
        await this.verifyConnection();
      }

      // Send the email
      const info = await transporter.sendMail({
        ...options,
        from: fromAddress,
        text: options?.text || convert(options.html),
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates the default configuration for the email service.
   *
   * @param {SMTPConnectionOptions} options - The new connection options.
   */
  public updateDefaultConfig(options: SMTPConnectionOptions): void {
    if (options.host) this.defaultHost = options.host;
    if (options.port) this.defaultPort = options.port;
    if (options.auth) this.defaultAuth = options.auth;

    // Update the default transporter
    this.transporter = nodemailer.createTransport({
      host: this.defaultHost,
      port: this.defaultPort,
      secure: options.secure !== undefined ? options.secure : true,
      auth: this.defaultAuth,
    });
  }

  /**
   * Creates a new instance of EmailService with custom configuration.
   *
   * @param {SMTPConnectionOptions} options - The connection options.
   * @returns {EmailService} A new email service instance.
   */
  public static create(options: SMTPConnectionOptions): EmailService {
    return new EmailService(
      options.host || process.env.EMAIL_HOST!,
      options.auth || {
        user: process.env.EMAIL_FROM!,
        pass: process.env.EMAIL_PASSWORD!,
      },
      options.port || parseInt(process.env.EMAIL_PORT || "465")
    );
  }
}

// Create default instance
const emailService = new EmailService();
export default emailService;
