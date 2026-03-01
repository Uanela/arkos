import { Callout } from 'fumadocs-ui/components/callout';

---
sidebar_position: 10
---

# File Uploads Authentication

**Arkos** provides authentication and authorization controls for file uploads, allowing you to secure your file upload endpoints using the same RBAC (Role-Based Access Control) mechanisms as your other API endpoints.

## Overview

File upload authentication in **Arkos** works with both Static and Dynamic RBAC approaches, enabling you to:

- Control which roles can upload files
- Control which roles can view files
- Control which roles can delete files
- Apply authentication requirements to file operations

## File Upload Authentication with Static RBAC

When using Static RBAC ([See Guide](/docs/core-concepts/authentication-system)), you can define authentication and access control for file uploads through a dedicated auth config file.

### Creating Auth Config for File Uploads

Unlike model-specific auth configs, file upload auth configs are placed in a dedicated file:

```ts
// src/modules/file-upload/file-upload.auth-configs.ts
import { AuthConfigs } from "arkos/auth";

const fileUploadAuthConfigs: AuthConfigs = {
  authenticationControl: {
    // Work
    Create: true, // Require authentication for file uploads (default)
    View: false, // Make it public
    Delete: true, // Require authentication for file deletion (default)
  },
  accessControl: {
    // only works on Static Authentication for Dynamic use DB
    Create: ["admin", "editor"], // Only these roles can upload files
    View: ["admin", "editor", "viewer"], // These roles can view files
    Delete: ["admin"], // Only admin role can delete files
  },
};

export default fileUploadAuthConfigs;
```

### Supported Actions

For file uploads, the following actions are relevant:

- `Create` - Controls who can upload files
- `View` - Controls who can view/download files
- `Delete` - Controls who can delete files

The `Update` action is not applicable to the default file upload system, as **Arkos** does not handle file updates directly. Instead, file updates are typically handled as a delete followed by a create operation.

## File Upload Authentication with Dynamic RBAC

When using Dynamic RBAC ([See Guide](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac)), you control file upload permissions through the database using the `AuthPermission` model.

### Creating Permissions for File Uploads

To grant file upload permissions:

1. Use `file-upload` as the `resource` field value in the `AuthPermission` model
2. Use `Create`, `View`, or `Delete` as the `action` field value

Example of creating permissions in your database:

```ts
// Example of creating file upload permissions programmatically
await prisma.authPermission.create({
  data: {
    resource: "file-upload", // Special resource for file uploads
    action: "Create", // For upload permissions
    roles: {
      connect: { id: editorRoleId },
    },
  },
});

await prisma.authPermission.create({
  data: {
    resource: "file-upload", // Special resource for file uploads
    action: "View", // For view permissions
    roles: {
      connect: { id: editorRoleId },
    },
  },
});

await prisma.authPermission.create({
  data: {
    resource: "file-upload", // Special resource for file uploads
    action: "View", // For view permissions
    roles: {
      connect: { id: viewerRoleId },
    },
  },
});

await prisma.authPermission.create({
  data: {
    resource: "file-upload", // Special resource for file uploads
    action: "View", // For view permissions
    roles: {
      connect: { id: adminRoleId },
    },
  },
});

await prisma.authPermission.create({
  data: {
    resource: "file-upload", // Special resource for file uploads
    action: "Delete", // For delete permissions
    roles: {
      connect: { id: adminRoleId },
    },
  },
});
```

<Callout type="info" title="important">
You do not need to implement any of the above, because these are simple CRUD operations that are handled automatically by **Arkos** generated endpoints as `AuthPermission` is mere prisma models even though being used for authentication.
</Callout>

### Auth Config for Public Routes

You can still use auth config files with Dynamic RBAC to define which file operations are public:

```ts
// src/modules/file-upload/file-upload.auth-configs.ts
import { AuthConfigs } from "arkos/auth";

const fileUploadAuthConfigs: AuthConfigs = {
  authenticationControl: {
    Create: true, // Require authentication for file uploads
    View: false, // Make it public
    Delete: true, // Require authentication for file deletion
  },
  // Note: accessControl is ignored in Dynamic RBAC mode
  // as permissions are defined in the database
};

export default fileUploadAuthConfigs;
```

## Handling File Updates

Since the `Update` action is not directly supported for file operations, developers should implement file updates as a two-step process:

1. Upload a new file
2. Delete the existing file
3. Or check a more in-depth explanation on [Best Practices for File Updates](/docs/core-concepts/file-uploads#best-practices-for-file-updates)

## Extended Use Cases

### Custom File Metadata Storage

Since **Arkos** does not store file metadata in the database by default, you may want to implement your own solution if you need to:

1. Track file ownership
2. Store additional metadata about files
3. Implement update operations for file metadata

You can create your own model for file metadata and implement custom controllers to handle these operations.

## Future Enhancements

In future releases, **Arkos** may include:

- Specific resources for different file types (e.g., `image-upload`, `video-upload`)
- Built-in metadata storage for files
- Direct support for the `Update` action for file operations

If you have suggestions or need additional features, please:

- Open an issue on [GitHub](https://github.com/uanela/arkos/issues)
- Consider becoming a contributor to the project

## Next Steps

For more information about the file upload system in general, refer to [File Uploads](/docs/core-concepts/file-uploads).
