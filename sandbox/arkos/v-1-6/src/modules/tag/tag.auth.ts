import { AuthConfigs } from 'arkos/auth';
import { authService } from "arkos/services";
export const tagAccessControl = {
  Create: {
    roles: []
    name: "Create Tag",
    description: "Permission to create new tag records",
  },
  Update: {
    roles: []
    name: "Update Tag",
    description: "Permission to update existing tag records",
  },
  Delete: {
    roles: []
    name: "Delete Tag",
    description: "Permission to delete tag records",
  },
  View: {
    roles: []
    name: "View Tag",
    description: "Permission to view tag records",
  },
} as const satisfies AuthConfigs["accessControl"];

function createTagPermission(action: string) {
  return authService.permission(action, "tag", tagAccessControl);
}
export const tagPermissions = {
  canCreate: createTagPermission("Create"),
  canUpdate: createTagPermission("Update"),
  canDelete: createTagPermission("Delete"),
  canView: createTagPermission("View"),
};
export const tagAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};
const tagAuthConfigs: AuthConfigs = {
  authenticationControl: tagAuthenticationControl,
  accessControl: tagAccessControl,
};
export default tagAuthConfigs;
