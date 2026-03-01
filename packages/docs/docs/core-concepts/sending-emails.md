import { Callout } from 'fumadocs-ui/components/callout';

---
sidebar_position: 8
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

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

The `EmailService` uses the `email` configuration from `arkos.config.ts`:

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    name: process.env.EMAIL_NAME,
  },
  // other configs
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

The `EmailService` uses the `email` configuration from `arkos.init()`:

```typescript
// src/app.ts
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

</TabItem>
</Tabs>

<Callout type="info">
You can pass these values directly if you want, but the best community practice is to use environment variables.
</Callout>

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

```typescript
// src/modules/auth/auth.interceptors.ts
import { emailService } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const afterSignup = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    try {
      const result = await emailService.send({
        to: "recipient@example.com",
        subject: "Welcome to Our Platform",
        html: "<h1>Welcome!</h1><p>Thank you for registering.</p>",
      });

      console.log(`Email sent successfully! Message ID: ${result.messageId}`);
      next();
    } catch (error) {
      console.error("Failed to send email:", error);
      next(); // Continue even if email fails
    }
  },
];
```

<Callout type="tip" title="Interceptor Arrays">
Remember that all interceptors allows being exported as arrays since v1.3.0. The example above shows the correct syntax.
</Callout>

<Callout type="warn" title="Naming Convention">
If you are on a version prior to `v1.4.0-beta` use the extensions `.middlewares.ts`.
</Callout>

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

## Best Practices

1. **Use Templates**: Instead of inline HTML, use template engines like Handlebars or EJS.

2. **Handle Errors**: Always wrap email sending in try-catch blocks to handle failures gracefully. Email sending should typically not break your application flow.

   ```typescript
   try {
     await emailService.send({
       to: user.email,
       subject: "Welcome!",
       html: welcomeTemplate,
     });
   } catch (error) {
     console.error("Failed to send welcome email:", error);
     // Continue with application flow
   }
   ```

3. **Security**: Never hardcode email credentials in your code. Always use environment variables.

4. **Rate Limiting**: Implement rate limiting for bulk emails to prevent IP blacklisting.

5. **Testing**: Create a mock transporter for testing without sending real emails:

   ```typescript
   // In your test setup
   import { EmailService } from "arkos/services";

   const mockEmailService = EmailService.create({
     host: "smtp.ethereal.email",
     port: 587,
     secure: false,
     auth: {
       user: "test@ethereal.email",
       pass: "testpassword",
     },
   });
   ```

6. **Background Jobs**: For non-critical emails, consider using a job queue to send emails asynchronously:

   ```typescript
   // In your interceptor
   export const afterSignup = [
     async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
       // Queue the email instead of sending immediately
       await emailQueue.add("welcome-email", {
         to: req.body.email,
         name: req.body.name,
       });
       next();
     },
   ];
   ```

## Common Use Cases

### Welcome Email After Signup

```typescript
// src/modules/auth/auth.interceptors.ts
export const afterSignup = [
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { email, name } = res.locals.data;

    try {
      await emailService.send({
        to: email,
        subject: "Welcome to Our Platform!",
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>Thank you for joining our platform.</p>
          <p>Get started by <a href="https://yourapp.com/onboarding">completing your profile</a>.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    next();
  },
];
```

### Password Reset Email

```typescript
// src/modules/auth/auth.controller.ts
import { emailService } from "arkos/services";

class AuthController {
  async requestPasswordReset(req: ArkosRequest, res: ArkosResponse) {
    const { email } = req.body;
    const resetToken = generateResetToken();

    // Save token to database
    await saveResetToken(email, resetToken);

    // Send reset email
    await emailService.send({
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="https://yourapp.com/reset-password?token=${resetToken}">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
  }
}
```

### Order Confirmation Email

```typescript
// src/modules/order/order.hooks.ts
export const afterCreateOne = [
  async (context: HookContext) => {
    const order = context.result;

    try {
      await emailService.send({
        to: order.customerEmail,
        subject: `Order Confirmation #${order.id}`,
        html: `
          <h1>Thank You for Your Order!</h1>
          <p>Order #${order.id} has been confirmed.</p>
          <h3>Order Details:</h3>
          <ul>
            ${order.items
              .map(
                (item) => `
              <li>${item.name} - $${item.price}</li>
            `
              )
              .join("")}
          </ul>
          <p><strong>Total: $${order.total}</strong></p>
        `,
      });
    } catch (error) {
      console.error("Failed to send order confirmation:", error);
    }
  },
];
```

## Diving Deeper

For more in-depth understanding of the `EmailService` class see [The EmailService Class API Reference](/docs/api-reference/the-email-service-class)
