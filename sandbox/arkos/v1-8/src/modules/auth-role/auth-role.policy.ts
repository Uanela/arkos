import { ArkosPolicy } from "arkos";

const authRolePolicy = ArkosPolicy("auth-role")
  .rule("Create", {
    name: "Create Auth Role",
    description: "Permission to create new auth role records",
  })
  .rule("View", {
    name: "View Auth Role",
    description: "Permission to view auth role records",
  })
  .rule("Update", {
    name: "Update Auth Role",
    description: "Permission to update existing auth role records",
  })
  .rule("Delete", {
    name: "Delete Auth Role",
    description: "Permission to delete auth role records",
  });

export default authRolePolicy;
