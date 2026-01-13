import { authService } from "arkos/services";

export const postAuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

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
};


export const postPermissions = Object.keys(postAccessControl).reduce(
  (acc, key) => {
    acc[`can${key}`] = authService.permission(
      key,
      "post",
      postAccessControl
    );
    return acc;
  },
  {} 
);

const postAuthConfigs = {
  authenticationControl: postAuthenticationControl,
  accessControl: postAccessControl,
};

export default postAuthConfigs;
