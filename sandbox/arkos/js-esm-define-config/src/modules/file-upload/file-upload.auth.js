/** @type {import('arkos/auth').AuthConfigs} */
const fileUplaodAuthConfigs = {
  authenticationControl: {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
  },
  accessControl: {
    // Create: {
    //   roles: [],
    //   name: "Upload File",
    //   description: "Permission to upload file"
    // },
    // Update: {
    //   roles: [],
    //   name: "Update File",
    //   description: "Permission to update file"
    // },
    // Delete: {
    //   name: "Delete File",
    //   description: "Permission to delete file"
    // },
    // View: {
    //   name: "View File",
    //   description: "Permission to view file"
    // },
  },
};

export default fileUplaodAuthConfigs;
