import { AuthConfigs } from 'arkos/auth';
import { authService } from "arkos/services";
export const authorAccessControl = {
  Create: {
    roles: []
    name: "Create Author",
    description: "Permission to create new author records",
  },
  Update: {
    roles: []
    name: "Update Author",
    description: "Permission to update existing author records",
  },
  Delete: {
    roles: []
    name: "Delete Author",
    description: "Permission to delete author records",
  },
  View: {
    roles: []
    name: "View Author",
    description: "Permission to view author records",
  },
} as const satisfies AuthConfigs["accessControl"];

function createAuthorPermission(action: string) {
  return authService.permission(action, "author", authorAccessControl);
}
export const authorPermissions = {
  canCreate: createAuthorPermission("Create"),
  canUpdate: createAuthorPermission("Update"),
  canDelete: createAuthorPermission("Delete"),
  canView: createAuthorPermission("View"),
};
export const authorAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};
const authorAuthConfigs: AuthConfigs = {
  authenticationControl: authorAuthenticationControl,
  accessControl: authorAccessControl,
};
export default authorAuthConfigs;
