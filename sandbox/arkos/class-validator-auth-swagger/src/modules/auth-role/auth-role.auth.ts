import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const authRolePermissions = {
  canCreate: authService.permission("Create", "auth-role"),
  canUpdate: authService.permission("Update", "auth-role"),
  canDelete: authService.permission("Delete", "auth-role"),
  canView: authService.permission("View", "auth-role"),
};

const authRoleAuthConfigs: AuthConfigs = {
  authenticationControl: {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
  },
};

export default authRoleAuthConfigs;
