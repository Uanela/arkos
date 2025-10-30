import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const userPermissions = {
  canCreate: authService.permission("Create", "user"),
  canUpdate: authService.permission("Update", "user"),
  canDelete: authService.permission("Delete", "user"),
  canView: authService.permission("View", "user"),
};

const userAuthConfigs: AuthConfigs = {
  authenticationControl: {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
  },
};

export default userAuthConfigs;
