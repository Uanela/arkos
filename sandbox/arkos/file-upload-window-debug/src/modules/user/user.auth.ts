import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const userPermissions = {
  canCreate: authService.permission("Create", "user", {
    Create: {
      roles: ["User", "Admin"],
      name: "Create New User",
      description: "Permission to create user records",
    },
  }),
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
  accessControl: {
    Create: {
      roles: ["User", "Admin"],
      name: "Create New User",
      description: "Permission to create user records",
    },
    // Update: {
    //   roles: [],
    //   name: "Update User",
    //   description: "Permission to update user records"
    // },
    // Delete: {
    //   roles: [],
    //   name: "Delete User",
    //   description: "Permission to delete user records"
    // },
    // View: {
    //   roles: [],
    //   name: "View User",
    //   description: "Permission to update user records"
    // },
  },
};

export default userAuthConfigs;
