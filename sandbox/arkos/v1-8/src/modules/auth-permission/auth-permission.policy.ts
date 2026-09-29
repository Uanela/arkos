import { ArkosPolicy } from "arkos";

const authPermissionPolicy = ArkosPolicy("auth-permission")
  .rule("Create", {
    name: "Create Auth Permission",
    description: "Permission to create new auth permission records",
  })
  .rule("View", {
    name: "View Auth Permission",
    description: "Permission to view auth permission records",
  })
  .rule("Update", {
    name: "Update Auth Permission",
    description: "Permission to update existing auth permission records",
  })
  .rule("Delete", {
    name: "Delete Auth Permission",
    description: "Permission to delete auth permission records",
  });

export default authPermissionPolicy;
