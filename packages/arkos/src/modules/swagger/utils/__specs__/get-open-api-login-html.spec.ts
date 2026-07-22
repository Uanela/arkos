import getOpenApiLoginHtml from "../get-open-api-login-html";
import { getArkosConfig } from "../../../../server";

jest.mock("../../../../server", () => ({
  getArkosConfig: jest.fn(),
}));

const mockGetArkosConfig = getArkosConfig as jest.MockedFunction<
  typeof getArkosConfig
>;

describe("getOpenApiLoginHtml", () => {
  beforeEach(() => {
    mockGetArkosConfig.mockReturnValue(undefined as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("default config (no arkosConfig)", () => {
    it("returns a string", () => {
      const html = getOpenApiLoginHtml();
      expect(typeof html).toBe("string");
    });

    it("uses default title", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Arkos.js OpenAPI Documentation");
    });

    it("uses default theme colors", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("#0f0f0f");
      expect(html).toContain("#1a1a1a");
      expect(html).toContain("#2e2e2e");
    });

    it("renders username label as Username", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Username");
    });

    it("does not render a select element when only one allowedUsername", () => {
      const html = getOpenApiLoginHtml();
      expect(html).not.toContain("<select");
    });

    it("includes login form elements", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain('id="loginForm"');
      expect(html).toContain('id="usernameField"');
      expect(html).toContain('id="password"');
      expect(html).toContain('id="loginButton"');
    });

    it("includes the Arkos.js footer link", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("https://www.arkosjs.com");
    });
  });

  describe("custom title", () => {
    it("uses the configured API title", () => {
      mockGetArkosConfig.mockReturnValue({
        swagger: {
          options: {
            definition: {
              info: { title: "My Custom API" },
            },
          },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("My Custom API");
      expect(html).not.toContain("Arkos.js OpenAPI Documentation");
    });
  });

  describe("theme colors", () => {
    const cases: Array<[string, string, string, string]> = [
      ["moon", "#0f1117", "#1c1e26", "#2e3040"],
      ["purple", "#0d0d14", "#1a1a2e", "#2e2e4a"],
      ["solarized", "#002b36", "#073642", "#124652"],
      ["bluePlanet", "#070b14", "#0d1424", "#1a2540"],
      ["saturn", "#0a0a0f", "#16161f", "#28283a"],
      ["kepler", "#0a0f0a", "#141f14", "#253525"],
      ["mars", "#0f0a08", "#1f1410", "#352520"],
      ["deepSpace", "#0a0a0a", "#121212", "#3a3a3a"],
    ];

    it.each(cases)("applies %s theme colors", (theme, bg, surface, border) => {
      mockGetArkosConfig.mockReturnValue({
        swagger: { scalarApiReferenceConfiguration: { theme } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain(bg);
      expect(html).toContain(surface);
      expect(html).toContain(border);
    });

    it("falls back to default theme for unknown theme name", () => {
      mockGetArkosConfig.mockReturnValue({
        swagger: {
          scalarApiReferenceConfiguration: { theme: "nonexistent" },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("#0f0f0f");
      expect(html).toContain("#1a1a1a");
      expect(html).toContain("#2e2e2e");
    });
  });

  describe("allowedUsernames — single entry", () => {
    it("formats camelCase field name as label", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: ["emailAddress"] } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Email Address");
    });

    it("formats dot-separated field using last segment", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["profile.emailAddress"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Email Address");
    });

    it("does not render select for a single entry", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: ["email"] } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).not.toContain("<select");
    });

    it("sets correct placeholder text from formatted label", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: ["phoneNumber"] } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Enter your phone number");
    });
  });

  describe("allowedUsernames — multiple entries", () => {
    it("renders a select element", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["email", "username"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("<select");
    });

    it("renders an option for each entry", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["email", "phoneNumber"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain('value="email"');
      expect(html).toContain('value="phoneNumber"');
    });

    it("formats option labels correctly", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["email", "phoneNumber"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Email");
      expect(html).toContain("Phone Number");
    });

    it("uses the first entry label as the initial username label", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["phoneNumber", "email"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Phone Number");
    });

    it("inlines the first allowedUsername into the JS fallback", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["email", "username"] },
        },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("'email'");
    });
  });

  describe("empty allowedUsernames array", () => {
    it("falls back to username as default", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: [] } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).toContain("Username");
    });

    it("does not render a select element", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: [] } },
      } as any);
      const html = getOpenApiLoginHtml();
      expect(html).not.toContain("<select");
    });
  });

  describe("HTML structure", () => {
    it("is valid enough to contain html and body tags", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<body");
      expect(html).toContain("</body>");
    });

    it("includes a viewport meta tag", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain('name="viewport"');
    });

    it("includes the error message container", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain('id="errorMessage"');
    });

    it("includes the login button with correct text", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain(">Login<");
    });

    it("includes the /api/auth/login fetch URL in the script", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("/api/auth/login");
    });

    it("redirects to /api/docs on success", () => {
      const html = getOpenApiLoginHtml();
      expect(html).toContain("/api/docs");
    });

    it("renders the select change listener only when multiple usernames present", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: { allowedUsernames: ["email", "username"] },
        },
      } as any);
      const multiHtml = getOpenApiLoginHtml();
      expect(multiHtml).toContain("usernameSelect.addEventListener");

      mockGetArkosConfig.mockReturnValue({
        authentication: { login: { allowedUsernames: ["email"] } },
      } as any);
      const singleHtml = getOpenApiLoginHtml();
      expect(singleHtml).not.toContain("usernameSelect.addEventListener");
    });
  });
});
