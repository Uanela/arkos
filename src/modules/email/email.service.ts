import nodemailer, { Transporter } from "nodemailer";
import { BaseService } from "../base/base.service";
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
 * A service class to handle email-related tasks, including sending emails.
 */
export class EmailService extends BaseService {
  private transporter: Transporter;

  /**
   * Creates an instance of the EmailService class.
   *
   * @param {string} [host] - The SMTP host (defaults to the environment variable `EMAIL_HOST`).
   * @param {object} [auth] - The authentication object containing `user` and `pass` for the email account.
   * @param {number} [port] - The SMTP port (defaults to 465).
   */
  constructor(
    host: string = process.env.EMAIL_HOST!,
    auth: object = {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
    port: number = parseInt(process.env.EMAIL_PORT || "465")
  ) {
    super("email");
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth,
    });
  }

  /**
   * Verifies the connection to the email server.
   * throws an AppError("Email Server Connection Failed", 500).
   */
  private verifyConnection(): void {
    this.transporter.verify((error) => {
      if (error) console.error("Email Server Connection Failed", 500);
    });
  }

  /**
   * Sends an email with the provided options.
   *
   * @param {EmailOptions} options - The options for the email to be sent.
   * @returns {Promise<{ success: boolean; messageId?: string; error?: any }>} A promise that resolves with the result of the email send attempt.
   * @throws {Error} Throws an error if the email sending fails.
   */
  public async send(
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      this.verifyConnection();

      const info = await this.transporter.sendMail({
        ...options,
        from: options?.from || process.env.EMAIL_FROM,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      throw error;
    }
  }
}

const emailService = new EmailService();

export default emailService;
