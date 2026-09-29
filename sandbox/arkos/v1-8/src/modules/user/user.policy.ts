import { ArkosPolicy } from "arkos";

const userPolicy = ArkosPolicy("user")
  .rule("Create", {
    name: "Create User",
    description: "Permission to create new user records",
  })
  .rule("View", {
    name: "View User",
    description: "Permission to view user records",
  })
  .rule("Update", {
    name: "Update User",
    description: "Permission to update existing user records",
  })
  .rule("Delete", {
    name: "Delete User",
    description: "Permission to delete user records",
  });

export default userPolicy;
