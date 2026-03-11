import { RouterConfig } from "../../../../exports";
import {
  AuthRouterEndpoint,
  FileUploadRouterEndpoint,
  RouterEndpoint,
} from "../../../../types/router-config";

export function isEndpointDisabled(
  routerConfig: RouterConfig<any>,
  endpoint: RouterEndpoint | AuthRouterEndpoint | FileUploadRouterEndpoint
): boolean {
  if (!routerConfig?.disable) return false;
  if (routerConfig.disable === true) return true;
  if (typeof routerConfig.disable === "object")
    return routerConfig.disable[endpoint as never] === true;
  return false;
}
