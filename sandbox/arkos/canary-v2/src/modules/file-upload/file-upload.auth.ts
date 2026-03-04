import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

export const fileUploadAccessControl = {
  Create: {
    roles: [],
    name: "Upload File",
    description: "Permission to upload file"
  },
  Update: {
    roles: [],
    name: "Update File",
    description: "Permission to update file"
  },
  Delete: {
    roles: [],
    name: "Delete File",
    description: "Permission to delete file"
  },
  View: {
    roles: [],
    name: "View File",
    description: "Permission to view file"
  },
} as const satisfies AuthConfigs["accessControl"];

export const fileUploadPermissions = {
  canCreate: authService.permission("Create", "file-upload"),
  canUpdate: authService.permission("Update", "file-upload"),
  canDelete: authService.permission("Delete", "file-upload"),
  canView: authService.permission("View", "file-upload"),
};

export const fileUploadAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const fileUploadAuthConfigs: AuthConfigs = {
  authenticationControl: fileUploadAuthenticationControl,
  accessControl: fileUploadAccessControl,
};

export default fileUploadAuthConfigs;
