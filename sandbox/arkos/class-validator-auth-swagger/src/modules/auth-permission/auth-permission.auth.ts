import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const authPermissionPermissions = {
  canCreate: authService.permission("Create", "auth-permission"),
  canUpdate: authService.permission("Update", "auth-permission"),
  canDelete: authService.permission("Delete", "auth-permission"),
  canView: authService.permission("View", "auth-permission"),
};

const authPermissionAuthConfigs: AuthConfigs = {
  authenticationControl: {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
  },
};

export default authPermissionAuthConfigs;
