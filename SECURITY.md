# Security Policy

## Supported Versions

We take security seriously in Arkos.js. The following versions are currently supported with security updates:

| Version             | Supported          | Status                   |
| ------------------- | ------------------ | ------------------------ |
| 1.5.x (latest beta) | :white_check_mark: | Active development       |
| 1.4.x  | :white_check_mark: | Patch updates until 10/05/26       |
| < 1.4.x             | :x:                | Please upgrade to supported versions |

**Post-2.0 Stable Release Policy:**

- Latest 2.x stable version will receive security updates
- Previous major version (e.g., 1.10.x final) will receive critical security fixes for 6 months after 2.0 release
- Beta versions will no longer be supported after stable 2.0 release

We strongly recommend always using the latest version of Arkos.js to ensure you have the latest security patches.

## Reporting a Vulnerability

We appreciate the security community's efforts in responsibly disclosing vulnerabilities. If you discover a security issue in Arkos.js, please follow these steps:

### 1. **Do Not** Open a Public Issue

Please do not create a public GitHub issue for security vulnerabilities. This could put users at risk.

### 2. Email Us Privately

Send details of the vulnerability to:

**📧 uanela.como@formulawebpromax.com**

### 3. Include the Following Information

To help us understand and address the issue quickly, please include:

- **Description**: Clear explanation of the vulnerability
- **Impact**: What can an attacker do? What data/systems are at risk?
- **Affected Versions**: Which versions of Arkos.js are affected?
- **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
- **Proof of Concept**: Code, screenshots, or demo if possible
- **Suggested Fix**: If you have ideas on how to fix it (optional)
- **Your Contact Info**: How we can reach you for follow-up questions

**Example Template:**

```
Subject: [SECURITY] Brief description of vulnerability

Description:
[Explain the vulnerability]

Impact:
[What's at risk? Authentication bypass? Data exposure? etc.]

Affected Versions:
[e.g., 1.3.0-beta through 1.3.3-beta]

Steps to Reproduce:
1. Create an Arkos.js project
2. Configure authentication with...
3. Send a request to...
4. Observe that...

Proof of Concept:
[Code sample, curl command, or screenshot]

Suggested Fix (optional):
[Your ideas if any]
```

### 4. What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within **12 hours**
- **Initial Assessment**: We will provide an initial assessment within **3 business days**
- **Updates**: We will keep you informed of our progress
- **Resolution Timeline**: Depending on severity:
    - **Critical**: Patch within 1 week
    - **High**: Patch within 2 weeks
    - **Medium**: Patch within 1 month
    - **Low**: Addressed in next release cycle

### 5. Coordinated Disclosure

We follow **responsible/coordinated disclosure**:

1. You report the issue privately
2. We investigate and develop a fix
3. We test the fix thoroughly
4. We release a patched version
5. **Only then** do we publicly disclose the vulnerability with a security advisory

We aim to resolve and disclose issues within **90 days** of the initial report. If you believe we're not responding appropriately, please let us know.

### 6. Recognition

We value the security community's contributions. With your permission, we will:

- Credit you in the security advisory
- Mention you in the release notes (if you wish)
- Add you to our security acknowledgments

If you prefer to remain anonymous, we'll respect that too.

## Security Scope

### In Scope - Please Report These:

- **Authentication & Authorization Issues**
    - JWT token vulnerabilities
    - Permission bypass
    - Session handling issues
    - Role-based access control flaws

- **Injection Vulnerabilities**
    - SQL injection (despite Prisma's protections)
    - NoSQL injection
    - Command injection
    - Code injection

- **File Upload Vulnerabilities**
    - Path traversal
    - Arbitrary file upload
    - File type validation bypass
    - Malicious file execution

- **API Security Issues**
    - Mass assignment vulnerabilities
    - Insecure direct object references (IDOR)
    - Rate limiting bypass
    - CORS misconfigurations

- **Cross-Site Attacks**
    - Cross-Site Scripting (XSS)
    - Cross-Site Request Forgery (CSRF)

- **Data Exposure**
    - Sensitive data leakage
    - Insecure data storage
    - Logging of sensitive information

- **Cryptographic Issues**
    - Weak encryption
    - Insecure password hashing
    - Predictable random values

- **Dependency Vulnerabilities**
    - Critical vulnerabilities in Arkos.js dependencies

- **Framework-Level Issues**
    - Any security flaw in Arkos.js core code
    - Middleware vulnerabilities
    - Service layer security issues
    - CLI security issues

### Out of Scope - Please Don't Report:

- ❌ Vulnerabilities in **user application code** (not the framework itself)
- ❌ Issues that require **physical access** to a server
- ❌ **Social engineering** attacks
- ❌ **Denial of Service (DoS)** without demonstrating a significant impact
- ❌ **Already known and documented** issues (check existing advisories first)
- ❌ **Theoretical vulnerabilities** without proof of concept
- ❌ Issues in **third-party dependencies** (report to those projects directly, though we appreciate a heads-up)
- ❌ **Rate limiting** on non-critical endpoints
- ❌ **Missing security headers** alone (unless part of a larger exploit)
- ❌ **Self-XSS** (requires user to paste malicious code themselves)

## Security Best Practices for Arkos.js Users

While we work hard to make Arkos.js secure by default, please follow these best practices:

### 1. Keep Dependencies Updated

```bash
npm update
npm audit fix
```

### 2. Use Environment Variables

Never hardcode sensitive data:

```typescript
// ❌ DON'T
const secret = "my-secret-key";

// ✅ DO
const secret = process.env.JWT_SECRET;
```

### 3. Validate Input

Always validate and sanitize user input, even though Arkos.js provides helpers.

### 4. Configure Authentication Properly

```typescript
arkos.init({
    auth: {
        jwt: {
            secret: process.env.JWT_SECRET, // Strong, random secret
            expiresIn: "15m", // Short-lived tokens
        },
    },
});
```

### 5. Use HTTPS in Production

Never transmit authentication tokens over HTTP.

### 6. Review Generated Code

While Arkos.js generates secure code, always review what's generated for your specific use case.

### 7. Enable Strict Routing Mode

```typescript
// Only enable routes you actually need
export const config = {
    disable: {
        create: false,
        findMany: false,
        // Others disabled by default in strict mode
    },
};
```

### 8. Configure File Uploads Carefully

```typescript
arkos.init({
    fileUpload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB limit
        baseUploadDir: "./uploads",
    },
});
```

## Security Updates

Security updates will be announced through:

- 🔔 **GitHub Security Advisories**: https://github.com/Uanela/arkos/security/advisories
- 📝 **Release Notes**: Check CHANGELOG.md for security fixes

We recommend watching this repository for security updates.

## Questions?

If you have questions about this security policy or Arkos.js security in general, feel free to:

- Email: uanela.como@formulawebpromax.com
- Open a public discussion (for non-sensitive questions): [GitHub Discussions](https://github.com/Uanela/arkos/discussions)
