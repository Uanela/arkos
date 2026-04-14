import { ArkosPolicy } from "arkos";

const fileUploadPolicy = ArkosPolicy("file-upload")
  .rule("Create", {
    roles: [],
    name: "Upload File",
    description: "Permission to upload new files",
  })
  .rule("View", {
    roles: [],
    name: "View File",
    description: "Permission to view uploaded files",
  })
  .rule("Update", {
    roles: [],
    name: "Update File",
    description: "Permission to update file metadata",
  })
  .rule("Delete", {
    roles: [],
    name: "Delete File",
    description: "Permission to delete uploaded files",
  });

export default fileUploadPolicy;
