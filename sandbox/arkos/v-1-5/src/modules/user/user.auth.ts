import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const userAccessControl = {
  Create: {
    roles: [],
    name: "Create User",
    description: "Permission to create new user records",
  },
  Update: {
    roles: [],
    name: "Update User",
    description: "Permission to update existing user records",
  },
  Delete: {
    roles: [],
    name: "Delete User",
    description: "Permission to delete user records",
  },
  View: {
    roles: [],
    name: "View User",
    description: "Permission to view user records",
  },
} as const satisfies AuthConfigs["accessControl"];

export const userPermissions = {
  canCreate: authService.permission("Create", "user"),
  canUpdate: authService.permission("Update", "user"),
  canDelete: authService.permission("Delete", "user"),
  canView: authService.permission("View", "user"),
};

export const userAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const userAuthConfigs: AuthConfigs = {
  authenticationControl: userAuthenticationControl,
  accessControl: userAccessControl,
};

export default userAuthConfigs;
