---
sidebar_position: 5
---

# Sending Emails

**Arkos** provides a powerful EmailService class that delivers a robust and flexible solution for handling email-related tasks in your application with a simple, unified API.

The `EmailService` is built on top of Node.js's `nodemailer` library, providing a streamlined interface while maintaining flexibility. Key features include:

- Simple, unified API with a single versatile `send` method
- Support for both default and custom SMTP configurations
- HTML to plain text conversion
- Connection verification
- Easy configuration updates
- Multiple instance support

> You can read more about nodemailer itself at [https://www.npmjs.com/package/nodemailer](https://www.npmjs.com/package/nodemailer)

## Configuration

The `EmailService` uses these `arkosConfig` variables for its default configuration:

```ts
arkos.init({
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    name: process.env.EMAIL_NAME,
  },
  // other configs
});
```

:::info
You can pass these values directly if you want, but the best community practice is to use environment variables.
:::

The email configuration in **Arkos** allows you to set up email functionality through the `emailService`. Here's an explanation of each parameter:

#### `host`

- The URL or hostname of your email provider's SMTP server
- Example: `smtp.gmail.com`, `smtp.office365.com`, `smtp.mailgun.org`
- Required parameter

#### `port`

- The SMTP port number for your email provider
- Optional parameter with a default value of `465` (secure SMTP)
- Common alternatives: `587` (TLS), `25` (standard/insecure)

#### `secure`

- Boolean flag indicating whether to use a secure connection (TLS/SSL)
- Optional parameter with a default value of `true`
- Set to `false` when using port 587 (TLS)

#### `auth`

- Object containing authentication credentials:
  - `user`: The email address used for authentication with the SMTP server
  - `pass`: Your SMTP password or authentication token for the email account
- Required parameter

#### `name`

- The display name that appears alongside your email address
- Optional parameter
- Example: If set to "Your App Team", emails will appear from "Your App Team \<user@example.com\>"

This configuration enables the built-in email service in **Arkos** for sending emails from your application.

## Basic Usage

### Sending an Email with Default Configuration

```ts
// src/modules/auth/auth.middlewares.ts
import { emailService } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";

export const afterSignup = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const result = await emailService.send({
      to: "recipient@example.com",
      subject: "Welcome to Our Platform",
      html: "<h1>Welcome!</h1><p>Thank you for registering.</p>",
    });

    console.log(`Email sent successfully! Message ID: ${result.messageId}`);

    next();
  }
);
```

### Email Options

```typescript
type EmailOptions = {
  from?: string; // Optional: Overrides the default sender
  to: string | string[]; // Single recipient or array of recipients
  subject: string; // Email subject line
  text?: string; // Optional: Plain text version (auto-generated from HTML if not provided)
  html: string; // HTML content of the email
};
```

## Advanced Usage

### Sending with Custom SMTP Configuration

You can send an email using different credentials without changing the default configuration:

```typescript
await emailService.send(
  {
    to: "client@example.com",
    subject: "Your Invoice",
    html: "<p>Please find your invoice attached.</p>",
  },
  {
    host: "smtp.yourcompany.com",
    port: 587,
    secure: false,
    auth: {
      user: "billing@yourcompany.com",
      pass: "billingPassword",
    },
  }
);
```

### Creating Additional Email Service Instances

If you need to use multiple email configurations in your application:

```typescript
import { EmailService } from "arkos/services";

const marketingEmailService = EmailService.create({
  host: "smtp.marketing-provider.com",
  port: 587,
  secure: false,
  auth: {
    user: "marketing@yourcompany.com",
    pass: "marketingPassword",
  },
});

// Later in your code
await marketingEmailService.send({
  to: "prospects@example.com",
  subject: "Special Offer",
  html: "<h1>Limited Time Offer!</h1><p>Check out our new products...</p>",
});
```

### Updating Configuration

If you need to switch to a different email account for an existing service instance:

```typescript
emailService.updateConfig({
  host: "smtp.newprovider.com",
  port: 587,
  secure: false,
  auth: {
    user: "new@example.com",
    pass: "newPassword",
  },
});
```

## Connection Verification

The connection is automatically verified before sending emails with custom configuration, but you can also manually verify it:

```ts
// In some async function
const isConnected = await emailService.verifyConnection();

if (isConnected) {
  console.log("SMTP connection is working correctly");
} else {
  console.log("SMTP connection failed - please check your credentials");
}
```

You can skip connection verification when sending emails by passing a third parameter:

```typescript
await emailService.send(
  {
    to: "client@example.com",
    subject: "Quick notification",
    html: "<p>This is an urgent notice.</p>",
  },
  undefined, // Use default connection
  true // Skip verification to send faster
);
```

## Best Practices

1. **Use Templates**: Instead of inline HTML, use template engines like Handlebars or EJS.

2. **Handle Errors**: Always use `catchAsync` when sending emails during requests or try/catch blocks for other scenarios. See [catchAsync Function Guide](/docs/api-reference/the-catch-async-function).

3. **Security**: Never hardcode email credentials in your code.

4. **Rate Limiting**: Implement rate limiting for bulk emails to prevent IP blacklisting.

5. **Testing**: Create a mock transporter for testing without sending real emails.

## Diving Deeper

For more in-depth understanding of the `EmailService` class see [The EmailService Class API Reference](/docs/api-reference/the-email-service-class)
