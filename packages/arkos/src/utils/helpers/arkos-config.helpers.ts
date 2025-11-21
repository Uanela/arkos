import { getArkosConfig } from "../../exports";

export function isUsingAuthentication() {
  const { authentication } = getArkosConfig();

  return authentication?.mode;
}

export function isAuthenticationEnabled() {
  const { authentication } = getArkosConfig();

  return authentication?.mode && authentication?.enabled !== false;
}
