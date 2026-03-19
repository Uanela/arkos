import { getArkosConfig } from "../../../server";

function formatFieldLabel(field: string): string {
  const last = field.split(".").pop()!;
  return last
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function getOpenApiLoginHtml() {
  const arkosConfig = getArkosConfig();

  const theme =
    arkosConfig?.swagger?.scalarApiReferenceConfiguration?.theme || "default";

  const allowedUsernames = arkosConfig?.authentication?.login?.allowedUsernames
    ?.length
    ? arkosConfig.authentication.login.allowedUsernames
    : ["username"];

  const themeColors: Record<
    string,
    { bg: string; surface: string; border: string }
  > = {
    default: { bg: "#0f0f0f", surface: "#1a1a1a", border: "#2e2e2e" },
    moon: { bg: "#0f1117", surface: "#1c1e26", border: "#2e3040" },
    purple: { bg: "#0d0d14", surface: "#1a1a2e", border: "#2e2e4a" },
    solarized: { bg: "#002b36", surface: "#073642", border: "#124652" },
    bluePlanet: { bg: "#070b14", surface: "#0d1424", border: "#1a2540" },
    saturn: { bg: "#0a0a0f", surface: "#16161f", border: "#28283a" },
    kepler: { bg: "#0a0f0a", surface: "#141f14", border: "#253525" },
    mars: { bg: "#0f0a08", surface: "#1f1410", border: "#352520" },
    deepSpace: { bg: "#0a0a0a", surface: "#121212", border: "#3a3a3a" },
  };

  const colors = themeColors[theme] ?? themeColors["default"];

  const firstLabel = formatFieldLabel(allowedUsernames[0]);
  const showSelect = allowedUsernames.length > 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${arkosConfig?.swagger?.options?.definition?.info?.title || "Login Into OpenAPI Documentation"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${colors.bg};
    }

    .login-container {
      background-color: ${colors.surface};
      padding: 40px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
    }

    h1 {
      color: #ffffff;
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      color: #ffffff;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 12px 16px;
      background-color: ${colors.bg};
      border: 1px solid ${colors.border};
      border-radius: 4px;
      color: #ffffff;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    select {
      width: 100%;
      padding: 12px 16px;
      background-color: ${colors.bg};
      border: 1px solid ${colors.border};
      border-radius: 4px;
      color: #ffffff;
      font-size: 14px;
      transition: border-color 0.3s;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      cursor: pointer;
      /* custom arrow */
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
    }

    input[type="text"]:focus,
    input[type="password"]:focus,
    select:focus {
      outline: none;
      border-color: #ffffff;
    }

    input[type="text"]::placeholder,
    input[type="password"]::placeholder {
      color: #666666;
    }

    select option {
      background-color: ${colors.surface};
      color: #ffffff;
    }

    .login-button {
      width: 100%;
      padding: 12px;
      background-color: #ffffff;
      color: #1a1a1a;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .login-button:hover { background-color: #e0e0e0; }
    .login-button:active { transform: translateY(1px); }
    .login-button:disabled { background-color: #666666; cursor: not-allowed; }

    .error-message {
      color: #ff6b6b;
      font-size: 14px;
      margin-top: 10px;
      text-align: center;
      display: none;
    }

    .error-message.show { display: block; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Login</h1>
    <form id="loginForm">

      ${
        showSelect
          ? `
      <div class="form-group">
        <label for="usernameSelect">Login With</label>
        <select id="usernameSelect">
          ${allowedUsernames
            .map(
              (f) => `
          <option value="${f}">${formatFieldLabel(f)}</option>
          `
            )
            .join("")}
        </select>
      </div>
      `
          : ""
      }

      <div class="form-group">
        <label id="usernameLabel" for="usernameField">${firstLabel}</label>
        <input
          type="text"
          id="usernameField"
          placeholder="Enter your ${firstLabel.toLowerCase()}"
          required
        >
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          placeholder="Enter your password"
          required
        >
      </div>

      <button type="submit" class="login-button" id="loginButton">Login</button>
      <div class="error-message" id="errorMessage"></div>

    </form>
  </div>

  <script>
    const usernameLabel = document.getElementById('usernameLabel');
    const usernameField = document.getElementById('usernameField');
    const usernameSelect = document.getElementById('usernameSelect');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    function formatFieldLabel(field) {
      const last = field.split('.').pop();
      return last
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase())
        .trim();
    }

    if (usernameSelect) {
      usernameSelect.addEventListener('change', () => {
        const label = formatFieldLabel(usernameSelect.value);
        usernameLabel.textContent = label;
        usernameField.placeholder = \`Enter your \${label.toLowerCase()}\`;
      });
    }

    const params = new URLSearchParams(window.location.search);
    const urlErrorMessage = params.get('error-message');
    if (urlErrorMessage) {
      errorMessage.textContent = decodeURIComponent(urlErrorMessage);
      errorMessage.classList.add('show');
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const selectedField = usernameSelect ? usernameSelect.value : '${allowedUsernames[0]}';
      const password = document.getElementById('password').value;

      errorMessage.classList.remove('show');
      errorMessage.textContent = '';
      loginButton.disabled = true;
      loginButton.textContent = '...';

      try {
        const selectedField = usernameSelect ? usernameSelect.value : '${allowedUsernames[0]}';
        const fieldKey = selectedField.split('.').pop(); // last segment only as body key

        const response = await fetch(\`/api/auth/login?usernameField=\${selectedField}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [fieldKey]: usernameField.value,
            password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          window.location.href = '/api/docs';
        } else {
          errorMessage.textContent = data.message || 'Login failed';
          errorMessage.classList.add('show');
        }
      } catch {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.classList.add('show');
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
      }
    });
  </script>
</body>
</html>`;
}
