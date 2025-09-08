---
sidebar_position: 9
---

# File Upload Controller

The `fileUploadController` provides direct access to Arkos's file upload functionality, allowing you to integrate file upload operations into custom routes with your own business logic and access control rules.

## Overview

While Arkos provides built-in file upload endpoints at `/api/uploads/:fileType` by default, the `fileUploadController` allows you to create custom routes with specialized middleware, validation, and access control. This is particularly useful when you need to:

- Restrict file uploads to specific users (e.g., users can only update their own avatar)
- Add custom business logic before or after file operations
- Implement different access control rules than the global file upload permissions
- Create specialized endpoints with custom validation

## Import

```typescript
import fileUploadController from "arkos/controllers";
```

## Available Methods

The `fileUploadController` exposes three main methods for handling file operations:

### `uploadFile`

Handles file upload requests with support for image processing and multiple file types.

**Method Signature:**

```typescript
uploadFile(req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction)
```

**Supported File Types:**

- `images` - Image files with optional processing (resize, format conversion)
- `videos` - Video files
- `documents` - Document files
- `files` - Any other file type

**Query Parameters for Images:**

- `format` - Convert image format (e.g., `webp`, `jpg`, `png`)
- `width` - Set image width in pixels
- `height` - Set image height in pixels
- `resizeTo` - Resize to fit within specified pixels (maintains aspect ratio)

**Response Format:**

```typescript
{
  success: true,
  data: string | string[], // URL(s) of uploaded file(s)
  message: "File uploaded successfully" | "${count} files uploaded successfully"
}
```

### `deleteFile`

Handles file deletion requests by file URL.

**Method Signature:**

```typescript
deleteFile(req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction)
```

**Required Parameters:**

- `fileType` - The type of file (`images`, `videos`, `documents`, `files`)
- `fileName` - The name of the file to delete

**Response Format:**

```typescript
{
  success: true,
  message: "File deleted successfully"
}
```

### `updateFile`

Handles file update requests by deleting the old file and uploading a new one.

**Method Signature:**

```typescript
updateFile(req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction)
```

**Required Parameters:**

- `fileType` - The type of file (`images`, `videos`, `documents`, `files`)
- `fileName` - The name of the file to update

**Query Parameters:** (Same as `uploadFile` for image processing)

**Response Format:**

```typescript
{
  success: true,
  data: string | string[], // URL(s) of new uploaded file(s)
  message: "File updated successfully" | "File updated successfully. ${count} new files uploaded"
}
```

## Error Handling

All controller methods use Arkos's `catchAsync` wrapper, which automatically handles errors and passes them to the error handling middleware. For more information about error handling, see the [catchAsync function documentation](/docs/api-reference/the-catch-async-function).

Common error scenarios:

- Invalid file type (400)
- No file uploaded (400)
- File not found for deletion/update (404)
- File processing errors (passed to error handler)

## Usage Examples

### Basic Avatar Upload Route

Create a custom route that allows users to upload only their own avatar:

```ts
// src/modules/user/user.controller.ts

import { catchAsync, AppError } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import userService from "./user.service";

class UserController extends BaseController {
  constructor() {
    super("user");
  }

  // Custom middleware to ensure users can only update their own avatar
  validateAvatarOwnership = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const { userId } = req.params;

      // Ensure user can only update their own avatar
      if (req.user!.id !== userId) {
        return next(new AppError("You can only update your own avatar", 403));
      }

      // Set the fileType for the controller
      req.params.fileType = "images";
      next();
    }
  );

  addUserAvatarFileNameToRequestParams = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const user = await userService.findById(req.user!.id);

      req.params.fileType = "images";
      req.params.fileName = user.picture;

      next();
    }
  );
}

const userController = new UserController();

export default userController;
```

```typescript
// src/modules/user/user.router.ts
import { Router } from "express";
import { fileUploadController } from "arkos/controllers";
import { authService } from "arkos/services";
import userController from "./user.controller";

const userAvatarRouter = Router();

// Avatar upload route with custom access control
userAvatarRouter.post(
  "/:id/avatar",
  authService.authenticate,
  userController.validateAvatarOwnership,
  fileUploadController.updateFile
);

// Avatar upload route with custom access control
userAvatarRouter.delete(
  "/:id/avatar",
  authService.authenticate,
  userController.addUserAvatarFileNameToRequestParams,
  fileUploadController.deleteFile
);

export default userAvatarRouter;
```

### Custom Product Image Upload with Business Logic

```typescript
// src/modules/product/product.router.ts
import { Router } from "express";
import { RouterConfig } from "arkos";
import fileUploadController from "arkos/controllers";
import { authService } from "arkos/services";
import { catchAsync, AppError } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const config: RouterConfig = {
  // Keep auto-generated endpoints
};

const router = Router();

// Custom middleware for product image upload
const validateProductOwnership = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // Check if product belongs to the authenticated seller
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId: req.user.id,
    },
  });

  if (!product) {
    return next(new AppError("Product not found or access denied", 404));
  }

  // Set fileType for the controller
  req.params.fileType = "images";
  next();
});

// Custom product image upload endpoint
router.post(
  "/:productId/images",
  authService.authenticate,
  authService.handleAccessControl("Create", "product", {
    Create: ["Seller", "Admin"],
  }),
  validateProductOwnership,
  fileUploadController.uploadFile
);

// Custom product image deletion
router.delete(
  "/:productId/images/:fileName",
  authService.authenticate,
  authService.handleAccessControl("Delete", "product", {
    Delete: ["Seller", "Admin"],
  }),
  validateProductOwnership,
  fileUploadController.deleteFile
);

export default router;
```

### Document Upload with File Type Validation

```typescript
// src/routers/document-upload.router.ts
import { Router } from "express";
import fileUploadController from "arkos/controllers";
import { authService } from "arkos/services";
import { catchAsync, AppError } from "arkos/error-handler";
import multer from "multer";

const documentRouter = Router();

// Custom middleware to validate document types
const validateDocumentType = catchAsync(async (req, res, next) => {
  const allowedTypes = [".pdf", ".doc", ".docx", ".txt"];

  // This would run after multer processes the file
  if (req.file) {
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return next(
        new AppError("Only PDF, DOC, DOCX, and TXT files are allowed", 400)
      );
    }
  }

  req.params.fileType = "documents";
  next();
});

// Restricted document upload
documentRouter.post(
  "/api/documents/legal",
  authService.authenticate,
  authService.handleAccessControl("Create", "legal-document", {
    Create: ["Lawyer", "Admin"],
  }),
  validateDocumentType,
  fileUploadController.uploadFile
);

export default documentRouter;
```

## Access Control Considerations

When using `fileUploadController` in custom routes, you have full control over access permissions. This is particularly useful for:

### User-Specific File Operations

- Users updating their own profile pictures
- Authors managing their own article images
- Sellers managing their product photos

### Role-Based File Restrictions

- Only admins can upload certain document types
- Different file size limits for different user roles
- Restricted file types based on user permissions

### Business Logic Integration

- Validating file ownership before operations
- Custom file naming conventions
- Integration with your application's data models

## Integration with Interceptor Middlewares

You can combine `fileUploadController` with Arkos's interceptor middleware system:

```typescript
// src/modules/post/post.middlewares.ts
import { getFileUploadServices } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const beforeUpdateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Handle image upload if present
    const imageUrl = await getFileUploadServices().imageUploadService.upload(
      req,
      res,
      {
        format: "webp",
        resizeTo: 500,
      }
    );

    if (imageUrl) {
      // Store old image URL for cleanup
      const { image } = await prisma.post.findUnique({
        where: { id: req.params.id },
        select: { image: true },
      });

      req.body.image = imageUrl;
      req.query.ignoredFields = { oldImage: image };
    }

    next();
  }
);

export const afterUpdateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Clean up old image after successful update
    if (req.body.image && req.query.ignoredFields?.oldImage) {
      getFileUploadServices()
        .imageUploadService.deleteByUrl(req.query.ignoredFields.oldImage)
        .catch(console.error);
    }

    next();
  }
);
```

For more information about interceptor middlewares, see the [Interceptor Middlewares Guide](/docs/core-concepts/interceptor-middlewares).

## Authentication & Authorization

The `fileUploadController` does not include built-in authentication or authorization. You must add these manually using Arkos's auth services:

### Static RBAC Example

```typescript
import { authService } from "arkos/services";

router.post(
  "/custom-upload",
  authService.authenticate,
  authService.handleAccessControl("Create", "custom-resource", {
    Create: ["User", "Admin"],
  }),
  fileUploadController.uploadFile
);
```

### Dynamic RBAC Example

```typescript
import { authService } from "arkos/services";

router.post(
  "/custom-upload",
  authService.authenticate,
  authService.handleAccessControl("Create", "custom-resource"),
  fileUploadController.uploadFile
);
```

For the default file upload endpoints (`/api/uploads/:fileType`), the resource name is `file-upload`. When creating custom routes, you can use any resource name that fits your application's access control structure.

## Best Practices

1. **Always Add Authentication**: Custom file upload routes should include proper authentication middleware.

2. **Validate File Ownership**: When allowing file operations, ensure users can only modify files they own or have permission to access.

3. **Use Appropriate Resource Names**: Choose descriptive resource names for access control that reflect the specific use case.

4. **Handle Errors Gracefully**: Implement proper error handling for file operations, especially for deletion and update operations.

5. **Clean Up Resources**: When updating files, ensure old files are properly deleted to prevent storage bloat.

6. **Validate File Types**: Add custom validation for file types when needed, beyond the basic `images`, `videos`, `documents`, `files` categories.

## Related Documentation

- [File Uploads Guide](/docs/core-concepts/file-uploads) - General file upload system overview
- [Custom Routers Guide](/docs/core-concepts/adding-custom-routers) - Creating custom routes
- [Interceptor Middlewares](/docs/core-concepts/interceptor-middlewares) - Using middleware with file operations
- [File Upload Services Function Guide](/docs/api-reference/file-upload-services-function-guide) - Service layer file operations
- [Static RBAC Authentication](/docs/core-concepts/authentication-system) - Access control setup
- [Dynamic RBAC Authentication](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac) - Database-driven permissions
