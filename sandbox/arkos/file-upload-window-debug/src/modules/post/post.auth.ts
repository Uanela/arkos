import { AuthConfigs } from 'arkos/auth';
import { authService } from "arkos/services";

export const postAccessControl = {
  Create: {
    roles: [],
    name: "Create Post",
    description: "Permission to create new post records",
  },
  Update: {
    roles: [],
    name: "Update Post",
    description: "Permission to update existing post records",
  },
  Delete: {
    roles: [],
    name: "Delete Post",
    description: "Permission to delete post records",
  },
  View: {
    roles: [],
    name: "View Post",
    description: "Permission to view post records",
  },
} as const satisfies AuthConfigs["accessControl"];

function createPostPermission(action: string) {
  return authService.permission(action, "post", postAccessControl);
}
export const postPermissions = {
  canCreate: createPostPermission("Create"),
  canUpdate: createPostPermission("Update"),
  canDelete: createPostPermission("Delete"),
  canView: createPostPermission("View"),
};

export const postAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const postAuthConfigs: AuthConfigs = {
  authenticationControl: postAuthenticationControl,
  accessControl: postAccessControl,
};

export default postAuthConfigs;
