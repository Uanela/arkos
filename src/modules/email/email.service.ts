import nodemailer, { Transporter } from "nodemailer";
import { BaseService } from "../base/base.service";

export type EmailOptions = {
  from?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export class EmailService extends BaseService {
  private transporter: Transporter;

  constructor(
    host: string = process.env.EMAIL_HOST!,
    auth = { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
    port = parseInt(process.env.EMAIL_PORT || "465")
  ) {
    super("email");
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth,
    });
  }

  private verifyConnection(): void {
    this.transporter.verify((error) => {
      if (error) {
        console.error("Email server connection error:", error);
      } else {
        console.info("Email server connection successful");
      }
    });
  }

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
