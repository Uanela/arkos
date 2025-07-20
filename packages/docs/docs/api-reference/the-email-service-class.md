---
sidebar_position: 8
---

# The `EmailService` Class

This guide provides a detailed API reference for the `EmailService` class inside **Arkos**, which handles all email functionality in the system. Notice that this is a class used by **Arkos** under the hood and unless you really need to create your own instance and know what you doing you can create your own instance.

If you would like to know how to send emails is **Arkos** without the need to create an instance of `EmailService` on your own see [Sending Emails Guide](/docs/core-concepts/sending-emails).

## Constructor

```ts
constructor(config?: SMTPConnectionOptions)
```

Creates a new instance of the `EmailService` class.

### Parameters

- `config` (SMTPConnectionOptions, optional): Optional custom SMTP configuration. If provided, these settings will be used instead of the Arkos config.

### Default Configuration

EmailService by default uses the configuration from `arkos.init()`:

```ts
arkos.init({
  // other configs
  email: {
    host: "smtp.provider.com",
    port: 465, // Default is 465
    secure: true, // Default is true
    auth: {
      user: "your@email.com",
      pass: "yourPassword",
    },
    name: "Company Name", // Optional
  },
});
```

### Example

```ts
// Create using Arkos config from arkos.init()
const defaultEmailService = new EmailService();

// Create with custom configuration
const customEmailService = new EmailService({
  host: "smtp.custom-provider.com",
  port: 587,
  secure: false,
  auth: { user: "custom@example.com", pass: "customPassword" },
  name: "Custom Service",
});
```

## Methods

### `send()`

```ts
public async send(
  options: EmailOptions,
  connectionOptions?: SMTPConnectionOptions,
  skipVerification = false
): Promise<{ success: boolean; messageId?: string }>
```

Sends an email with the provided options using either the default configuration or custom connection settings.

#### Parameters

- `options` (EmailOptions): The email content and recipient information.
- `connectionOptions` (SMTPConnectionOptions, optional): Custom connection settings for this specific email.
- `skipVerification` (boolean, optional): Whether to skip connection verification. Default is `false`.

#### Returns

A Promise that resolves to an object containing:

- `success` (boolean): Whether the email was sent successfully.
- `messageId` (string, optional): The message ID if successful.

#### Throws

- Error: If the email sending process fails or if connection verification fails.
- AppError: If email configuration is not set in Arkos config when using default configuration.

#### Example

```ts
// Send with default configuration
await emailService.send({
  to: "user@example.com",
  subject: "Welcome",
  html: "<p>Welcome to our service!</p>",
});

// Send with temporary different credentials
await emailService.send(
  {
    to: "client@example.com",
    subject: "Invoice",
    html: "<p>Your invoice is ready</p>",
  },
  {
    host: "smtp.different-provider.com",
    auth: { user: "billing@example.com", pass: "billingPass" },
  }
);

// Skip connection verification (useful for already verified connections)
await emailService.send(
  {
    to: "quick@example.com",
    subject: "Quick Message",
    html: "<p>This message bypasses verification</p>",
  },
  undefined,
  true
);
```

### `verifyConnection()`

```ts
public async verifyConnection(transporterToVerify?: Transporter): Promise<boolean>
```

Verifies the connection to the email server.

#### Parameters

- `transporterToVerify` (Transporter, optional): A specific transporter to verify. If not provided, verifies the default transporter.

#### Returns

A Promise that resolves to:

- `true`: If connection is successful.
- `false`: If connection fails.

#### Example

```ts
// Check if email server connection is working
const isConnected = await emailService.verifyConnection();

if (isConnected) {
  console.log("SMTP connection is working correctly");
} else {
  console.log("SMTP connection failed - please check your credentials");
}
```

### `updateConfig()`

```ts
public updateConfig(config: SMTPConnectionOptions): void
```

Updates the custom configuration for this email service instance.

#### Parameters

- `config` (SMTPConnectionOptions): The new connection options.

#### Example

```ts
emailService.updateConfig({
  host: "smtp.newprovider.com",
  port: 587,
  secure: false,
  auth: { user: "new@example.com", pass: "newPassword" },
  name: "Updated Email Service",
});
```

### `static create()`

```ts
public static create(config: SMTPConnectionOptions): EmailService
```

Creates a new instance of EmailService with custom configuration.

#### Parameters

- `config` (SMTPConnectionOptions): The connection options for the new instance.

#### Returns

A new `EmailService` instance.

#### Example

```ts
const marketingEmails = EmailService.create({
  host: "smtp.marketing-provider.com",
  auth: { user: "marketing@example.com", pass: "marketingPass" },
  name: "Marketing Communications",
});
```

## Multiple Email Service Instances

For applications that regularly send emails from different accounts:

```typescript
import { EmailService } from "arkos/services";

const marketingEmails = EmailService.create({
  host: "smtp.marketing-provider.com",
  auth: { user: "marketing@example.com", pass: "marketingPass" },
});

const supportEmails = EmailService.create({
  host: "smtp.support-provider.com",
  auth: { user: "support@example.com", pass: "supportPass" },
});

// Now you can use them independently
await marketingEmails.send({
  to: "customer@example.com",
  subject: "New Products Available",
  html: "<p>Check out our new products!</p>",
});

await supportEmails.send({
  to: "customer@example.com",
  subject: "Your Support Ticket",
  html: "<p>Your issue has been resolved.</p>",
});
```

## Type Definitions

### EmailOptions

```ts
type EmailOptions = {
  from?: string; // Sender's email address (optional)
  to: string | string[]; // Recipient(s) email address
  subject: string; // Subject of the email
  text?: string; // Plain text body (optional)
  html: string; // HTML body
};
```

Defines the options for sending an email.

### SMTPAuthOptions

```ts
type SMTPAuthOptions = {
  user: string; // Username or email address
  pass: string; // Password
};
```

Defines the authentication options for SMTP.

### SMTPConnectionOptions

```ts
type SMTPConnectionOptions = {
  host?: string; // SMTP host server
  port?: number; // SMTP port
  secure?: boolean; // Whether to use SSL/TLS
  auth?: SMTPAuthOptions; // Authentication credentials
  name?: string; // Email sender name
};
```

Defines the connection options for SMTP server.

## Error Handling

This example shows various ways to use the email service with proper error handling:

```ts
import { emailService, EmailService } from "arkos/services";
import { catchAsync } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

// Example: this is not a built-in middleware
const demonstrateEmailService = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    try {
      // 1. Send with default configuration from arkos.init()
      await emailService.send({
        to: "user@example.com",
        subject: "Welcome",
        html: "<p>Welcome to our service!</p>",
      });

      // 2. Send with temporary different credentials
      await emailService.send(
        {
          to: "client@example.com",
          subject: "Invoice",
          html: "<p>Your invoice is ready</p>",
        },
        {
          host: "smtp.billing-provider.com",
          auth: { user: "billing@example.com", pass: "billingPass" },
        }
      );

      // 3. Update config for this instance
      emailService.updateConfig({
        host: "smtp.notifications.com",
        auth: { user: "notifications@example.com", pass: "notifyPass" },
      });

      // 4. Send with updated config
      await emailService.send({
        to: "member@example.com",
        subject: "Notification",
        html: "<p>You have a new notification</p>",
      });

      // 5. Create a dedicated instance
      const marketingEmailer = EmailService.create({
        host: "smtp.marketing-server.com",
        auth: { user: "marketing@example.com", pass: "marketingPass" },
        name: "Marketing Team",
      });

      // 6. Use the dedicated instance
      await marketingEmailer.send({
        to: "prospect@example.com",
        subject: "Special Offer",
        html: "<p>Check out our new products!</p>",
      });

      res.status(200).json({ message: "All emails sent successfully" });
    } catch (error) {
      next(error);
    }
  }
);
```
