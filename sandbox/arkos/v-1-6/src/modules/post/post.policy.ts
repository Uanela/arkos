import { ArkosPolicy } from "arkos";

const postPolicy = ArkosPolicy("post")
  .rule("Create", {
    roles: []
name: "Create Post",
    description: "Permission to create new post records",
  })
  .rule("View", {
    roles: []
name: "View Post",
    description: "Permission to view post records",
  })
  .rule("Update", {
    roles: []
name: "Update Post",
    description: "Permission to update existing post records",
  })
  .rule("Delete", {
    roles: []
name: "Delete Post",
    description: "Permission to delete post records",
  });

export default postPolicy;
