import { ArkosPolicy } from "arkos";

const authorPolicy = ArkosPolicy("author")
  .rule("Create", {
    roles: []
name: "Create Author",
    description: "Permission to create new author records",
  })
  .rule("View", {
    roles: []
name: "View Author",
    description: "Permission to view author records",
  })
  .rule("Update", {
    roles: []
name: "Update Author",
    description: "Permission to update existing author records",
  })
  .rule("Delete", {
    roles: []
name: "Delete Author",
    description: "Permission to delete author records",
  });

export default authorPolicy;
