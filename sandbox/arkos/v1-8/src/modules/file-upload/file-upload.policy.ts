import { ArkosPolicy } from "arkos";

const fileUploadPolicy = ArkosPolicy("file-upload")
  .rule("Create", {
    name: "Upload File",
    description: "Permission to upload new files",
  })
  .rule("View", {
    name: "View File",
    description: "Permission to view uploaded files",
  })
  .rule("Update", {
    name: "Update File",
    description: "Permission to update file metadata",
  })
  .rule("Delete", {
    name: "Delete File",
    description: "Permission to delete uploaded files",
  });

export default fileUploadPolicy;
