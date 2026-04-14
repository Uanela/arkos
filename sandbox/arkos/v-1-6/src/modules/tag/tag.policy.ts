import { ArkosPolicy } from "arkos";

const tagPolicy = ArkosPolicy("tag")
  .rule("Create", {
    roles: []
name: "Create Tag",
    description: "Permission to create new tag records",
  })
  .rule("View", {
    roles: []
name: "View Tag",
    description: "Permission to view tag records",
  })
  .rule("Update", {
    roles: []
name: "Update Tag",
    description: "Permission to update existing tag records",
  })
  .rule("Delete", {
    roles: []
name: "Delete Tag",
    description: "Permission to delete tag records",
  });

export default tagPolicy;
