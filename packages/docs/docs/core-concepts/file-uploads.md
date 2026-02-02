---
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# File Uploads

**Arkos** provides a robust file upload system that supports various file types including images, videos, and documents. Starting with `v1.4.0-beta`, ArkosRouter introduces a powerful declarative configuration system that makes file uploads seamless, especially for auto-generated CRUD endpoints.

## Two Approaches to File Uploads

Arkos offers two main methods for handling file uploads:

### 1. ArkosRouter Configuration (Recommended for v1.4.0+)

Configure file uploads directly in your route definitions - works for both auto-generated and custom routes.

**Best for:**
- User registration/updates with profile photos
- Creating posts with featured images
- Product creation with multiple images
- Any model-related file uploads

**Advantages:**
- Single API call (data + files together)
- Files automatically attached to `req.body`
- Automatic error cleanup with `deleteOnError`
- Clean, declarative configuration
- Supports nested fields like `profile[photo]`

### 2. Traditional Route Handler

Use dedicated upload endpoints (`/api/uploads/:fileType`) and manually reference file URLs.

**Best for:**
- Standalone file operations
- Complex custom upload logic
- When you need full manual control

**Trade-offs:**
- Requires separate API calls (upload first, then create/update)
- Manual file reference management
- You handle cleanup logic

:::tip Which Approach to Use?
If your files are related to a model (user avatars, post images, product galleries), use **ArkosRouter Configuration**. It's simpler and requires just one API call. Use the traditional approach only when you need standalone file operations or very custom logic.
:::

## Auto-Generated Routes with File Uploads

The most common use case - adding file upload capabilities to your auto-generated CRUD endpoints.

### Example 1: User Profile Photo

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

**1. Configure the upload in your model router:**

```typescript
// src/modules/user/user.router.ts
import { ArkosRouter, RouterConfig } from "arkos";

export const config: RouterConfig = {
  createOne: {
    authentication: false, // Or configure as needed
    experimental: {
      uploads: {
        type: "single",
        field: "profilePhoto",
        uploadDir: "user-profiles",
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
        deleteOnError: true, // (Default) Clean up if user creation fails
        required: true, // (Default 1.5.0+) Mark a file as required
      },
    },
  },
  updateOne: {
    authentication: true,
    experimental: {
      uploads: {
        type: "single",
        field: "profilePhoto",
        uploadDir: "user-profiles",
        required: false, // (v1.5.0+) Mark the file as optional
        // deleteOnError: true, we can omit this as it is default

      },
    },
  },
};

const userRouter = ArkosRouter();

export default userRouter;
```

:::tip Required Flag
Notice that the `required` flag defaults to true, if ommited the file will be required yet, so if you want to make it optional pass `required: false`. Is important to know that this feature of `required` flag was added at [v1.5.0+](/blog/1.5-beta).
:::

**2. Client-side usage - Single API call:**

```typescript
// Create user with profile photo
const formData = new FormData();
formData.append("name", "John Doe");
formData.append("email", "john@example.com");
formData.append("password", "securepass123");
formData.append("profilePhoto", imageFile); // Field name matches config

const response = await fetch("http://localhost:8000/api/users", {
  method: "POST",
  body: formData,
  // Don't set Content-Type header - browser handles it for FormData
});

const user = await response.json();
console.log(user.profilePhoto); // "/uploads/user-profiles/1234567890-photo.jpg"
```

**What happens behind the scenes:**
1. ArkosRouter processes the upload based on your configuration
2. File is saved to `uploads/user-profiles/`
3. File path is automatically added to `req.body.profilePhoto`
4. Prisma creates the user with the file path included
5. If creation fails and `deleteOnError: true`, the uploaded file is cleaned up

:::tip OpenAPI Documentation (v1.4.0)
One of the greatest advantage of using `ArkosRouter` for file uploads is that it will automatically sync with your OpenAPI documentation, basically arkos will create an `requestBody` of type [`multipart/form-data`](https://swagger.io/docs/specification/v3_0/describing-request-body/multipart-requests/) so that you can easily test your api without the need to write it from scratch. Understand how it works by reading [OpenAPI Documentation File Upload Guide](/docs/core-concepts/open-api-documentation#arkosrouter-openapi-integration-with-file-uploads).
:::

</TabItem>
<TabItem value="v1.3" label="v1.3.0 (Old Way)">

**Old approach required separate API calls:**

```typescript
// 1. First upload the file
const uploadFormData = new FormData();
uploadFormData.append("images", imageFile);

const uploadResponse = await fetch("http://localhost:8000/api/uploads/images", {
  method: "POST",
  body: uploadFormData,
});

const { urls } = await uploadResponse.json();
const imageUrl = urls[0];

// 2. Then create the user with the URL
const userResponse = await fetch("http://localhost:8000/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    password: "securepass123",
    profilePhoto: imageUrl,
  }),
});

// 3. Manual error handling and cleanup
if (!userResponse.ok) {
  // You'd need to manually delete the uploaded file
  await fetch(`http://localhost:8000/api/uploads/images/${extractFileName(imageUrl)}`, {
    method: "DELETE",
  });
}
```

</TabItem>
</Tabs>

### Example 2: Product with Multiple Images

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter, RouterConfig } from "arkos";

export const config: RouterConfig = {
  createOne: {
    authentication: {
      resource: "product",
      action: "Create",
      rule: { roles: ["Admin", "Vendor"] },
    },
    experimental: {
      uploads: {
        type: "array",
        field: "images",
        maxCount: 8,
        uploadDir: "product-images",
        maxSize: 5 * 1024 * 1024, // 5MB per image
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
        deleteOnError: true,
      },
    },
  },
};

const productRouter = ArkosRouter();

export default productRouter;
```

**Client usage with multiple files:**

```typescript
const formData = new FormData();
formData.append("name", "Professional Camera");
formData.append("description", "High-quality DSLR camera...");
formData.append("price", "1299.99");

// Add multiple images - same field name
formData.append("images", imageFile1);
formData.append("images", imageFile2);
formData.append("images", imageFile3);

const response = await fetch("http://localhost:8000/api/products", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});

const product = await response.json();
console.log(product.images); // ["/uploads/product-images/file1.jpg", "/uploads/product-images/file2.jpg", ...]
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0">

```typescript
// Required custom middleware and manual handling
import { Router } from "express";
import multer from "multer";

const upload = multer({ 
  dest: "uploads/product-images",
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

router.post(
  "/",
  authService.authenticate,
  authService.handleAccessControl("Create", "product", authConfigs.accessControl),
  upload.array("images", 8),
  productController.createOne
);
```

</TabItem>
</Tabs>

### Example 3: Multiple File Types (Fields)

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/modules/product/product.router.ts
import { ArkosRouter, RouterConfig } from "arkos";

export const config: RouterConfig = {
  createOne: {
    authentication: {
      resource: "product",
      action: "Create",
      rule: { roles: ["Admin", "Vendor"] },
    },
    experimental: {
      uploads: {
        type: "fields",
        fields: [
          { name: "thumbnail", maxCount: 1 },
          { name: "gallery", maxCount: 6 },
          { name: "manual", maxCount: 1 },
        ],
        uploadDir: "products",
        deleteOnError: true,
      },
    },
  },
};

const productRouter = ArkosRouter();

export default productRouter;
```

**Client usage:**

```typescript
const formData = new FormData();
formData.append("name", "Professional Camera");
formData.append("price", "1299.99");

// Different file types for different fields
formData.append("thumbnail", thumbnailImage);
formData.append("gallery", galleryImage1);
formData.append("gallery", galleryImage2);
formData.append("gallery", galleryImage3);
formData.append("manual", pdfManualFile);

const response = await fetch("http://localhost:8000/api/products", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});

const product = await response.json();
// {
//   name: "Professional Camera",
//   price: 1299.99,
//   thumbnail: "/uploads/products/thumbnail-123.jpg",
//   gallery: ["/uploads/products/gallery-1.jpg", "/uploads/products/gallery-2.jpg", ...],
//   manual: "/uploads/products/manual-456.pdf"
// }
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0">

Required complex multer configuration with custom middleware.

</TabItem>
</Tabs>

### Nested Field Support

ArkosRouter supports nested field notation using bracket syntax:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ Only" default>

```typescript
// src/modules/user/user.router.ts
import { ArkosRouter, RouterConfig } from "arkos";

export const config: RouterConfig = {
  createOne: {
    experimental: {
      uploads: {
        type: "single",
        field: "profile[photo]", // Nested field notation
        uploadDir: "user-profiles",
      },
    },
  },
};

const userRouter = ArkosRouter();

export default userRouter;
```

**Client usage:**

```typescript
const formData = new FormData();
formData.append("name", "John Doe");
formData.append("email", "john@example.com");
formData.append("profile[photo]", profileImage); // Bracket notation in field name

const response = await fetch("http://localhost:8000/api/users", {
  method: "POST",
  body: formData,
});

const user = await response.json();
// Result:
// {
//   name: "John Doe",
//   email: "john@example.com",
//   profile: {
//     photo: "/uploads/user-profiles/photo-123.jpg"
//   }
// }
```

</TabItem>
<TabItem value="v1.3" label="Not Available in v1.3.0">

Nested field support is not available in v1.3.0. You would need to manually parse and structure the data.

</TabItem>
</Tabs>

## Custom Routes with File Uploads

For custom endpoints that aren't part of auto-generated CRUD operations, use ArkosRouter's configuration in custom routes for easily upload file on custom routes.

### Example: Custom Share Endpoint with Attachment

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/modules/post/post.router.ts
import { ArkosRouter, RouterConfig } from "arkos";
import z from "zod";
import postController from "./post.controller";

export const config: RouterConfig = {
  // ... auto-generated endpoint configs
};

const postRouter = ArkosRouter();

// Custom endpoint to share a post with attachment
postRouter.post(
  {
    path: "/:id/share",
    authentication: {
      resource: "post",
      action: "Share",
      rule: { roles: ["User", "Author", "Admin"] },
    },
    validation: {
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        recipientEmail: z.string().email(),
        message: z.string().optional(),
      }),
    },
    experimental: {
      uploads: {
        type: "single",
        field: "attachment",
        uploadDir: "post-shares",
        maxSize: 10 * 1024 * 1024, // 10MB
        deleteOnError: true,
      },
    },
  },
  postController.shareWithAttachment
);

export default postRouter;
```

**Controller implementation:**

```typescript
// src/modules/post/post.controller.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { BaseController } from "arkos/controllers";
import { emailService } from "arkos/services";
import postService from "./post.service";

class PostController extends BaseController {
  async shareWithAttachment (
    req: ArkosRequest,
    res: ArkosResponse,
    next: ArkosNextFunction
  ) {
    const { id } = req.params;
    const { recipientEmail, message } = req.body;
    const attachmentUrl = req.body.attachment; // File URL automatically added by ArkosRouter

    const post = await postService.findOne(
        { id },
        { include: { author: true } }
    );

    if (!post) 
      return res.status(404).json({ error: "Post not found" });


    await emailService.send({
      to: recipientEmail,
      subject: `${post.author.name} shared a post with you`,
      body: message || `Check out this post: ${post.title}`,
      attachments: attachmentUrl ? [attachmentUrl] : [],
    });

    res.status(200).json({
      success: true,
      message: "Post shared successfully",
    });
  },
}

const postController = new PostController('post')

export default postController;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0">

```typescript
// src/modules/post/post.router.ts
import { Router } from "express";
import multer from "multer";
import { authService } from "arkos/services";
import postController from "./post.controller";

const upload = multer({
  dest: "uploads/post-shares",
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post(
  "/:id/share",
  authService.authenticate,
  authService.handleAccessControl("Share", "post", authConfigs.accessControl),
  upload.single("attachment"),
  postController.shareWithAttachment
);

export default router;
```

</TabItem>
</Tabs>

### Example: Standalone Custom Router

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// src/routers/reports.router.ts
import { ArkosRouter } from "arkos";
import z from "zod";
import reportsController from "../controllers/reports.controller";

const reportsRouter = ArkosRouter();

reportsRouter.post(
  {
    path: "/api/reports/upload",
    authentication: {
      resource: "report",
      action: "Upload",
      rule: { roles: ["Admin", "Analyst"] },
    },
    validation: {
      body: z.object({
        reportType: z.enum(["sales", "inventory", "analytics"]),
        notes: z.string().optional(),
      }),
    },
    experimental: {
      uploads: {
        type: "single",
        field: "reportFile",
        uploadDir: "reports",
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: [".xlsx", ".csv", ".pdf"],
        deleteOnError: true,
      },
    },
  },
  reportsController.processUploadedReport
);

export default reportsRouter;
```

**Register the custom router:**

```typescript
// src/app.ts
import arkos from "arkos";
import reportsRouter from "./routers/reports.router";

arkos.init({
  use: [reportsRouter],
});
```

**Client usage:**

```typescript
const formData = new FormData();
formData.append("reportType", "sales");
formData.append("notes", "Q1 2024 sales data");
formData.append("reportFile", excelFile);

const response = await fetch("http://localhost:8000/api/reports/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0">

```typescript
// src/routers/reports.router.ts
import { Router } from "express";
import multer from "multer";
import { authService } from "arkos/services";

const upload = multer({
  dest: "uploads/reports",
  limits: { fileSize: 50 * 1024 * 1024 },
});

const reportsRouter = Router();

reportsRouter.post(
  "/api/reports/upload",
  authService.authenticate,
  authService.handleAccessControl("Upload", "report", authConfigs.accessControl),
  upload.single("reportFile"),
  reportsController.processUploadedReport
);

export default reportsRouter;
```

</TabItem>
</Tabs>

## Traditional Route Handler Approach

This file upload system using dedicated endpoints. Use this when you need standalone file operations or very specific custom logic.

### Available Endpoints

By default, Arkos exposes the following file upload endpoints:

- `POST /api/uploads/:fileType` - Upload files of a specific type
- `PATCH /api/uploads/:fileType/:fileName` - Update/replace existing files
- `DELETE /api/uploads/:fileType/:fileName` - Delete a specific file

Where `:fileType` can be one of:

- `images` - For image files
- `videos` - For video files
- `documents` - For document files
- `files` - For any other file type


:::tip 
Bear in mind the `/api/uploads` is the default `baseRoute` and you can customize it through your arkos configuration. See this at [File Upload Configuration](/docs/core-concepts/file-uploads#global-configuration).
:::

### Basic Operations

:::info FormData Field Names
When uploading to traditional endpoints, use these field names:
- `/api/uploads/images` → use field name `images`
- `/api/uploads/videos` → use field name `videos`
- `/api/uploads/documents` → use field name `documents`
- `/api/uploads/files` → use field name `files`
:::

#### Uploading Files

```typescript
// Using fetch API
const formData = new FormData();
formData.append("images", imageFile);

fetch("http://localhost:8000/api/uploads/images", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

:::info FormData Fields
Pay attention to the FormData field names. Even for a single image, use the field name `images` (plural). The same applies for other supported types (`videos`, `documents`) and overall `files`.
:::

#### Updating/Replacing Files

The `PATCH /api/uploads/:fileType/:fileName` endpoint provides intelligent file replacement:

```typescript
// Replace an existing image
const formData = new FormData();
formData.append("images", newImageFile);

fetch("http://localhost:8000/api/uploads/images/old-image.jpg", {
  method: "PATCH",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

**How the Auto-Update Endpoint Works:**

1. **Automatic Cleanup**: Deletes the old file (if it exists) before uploading the new one
2. **Intelligent Processing**: Processes the new file with the same logic as regular uploads
3. **Multiple File Support**: Supports both single and multiple file replacements
4. **Universal File Type Support**: Works with images, videos, documents, and general files
5. **Error Handling**: Provides appropriate error messages for missing old files
6. **Smart Response**: Returns different success messages based on whether it replaced an existing file or created a new one

**Response Examples:**

```json
// When replacing an existing file
{
  "success": true,
  "message": "File replaced successfully",
  "urls": ["http://localhost:8000/uploads/images/new-image.jpg"]
}

// When the old file doesn't exist (acts like regular upload)
{
  "success": true,
  "message": "File uploaded successfully",
  "urls": ["http://localhost:8000/uploads/images/new-image.jpg"]
}
```

#### Deleting Files

```typescript
fetch("http://localhost:8000/api/uploads/images/1234567890-image.jpg", {
  method: "DELETE",
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### When to Use Traditional Endpoints

Use traditional endpoints when:

- You need to upload files independently of any model operation
- You want maximum control over the upload process
- You're building a file management system
- You need to upload files before deciding where to use them

**Example workflow:**

```typescript
// 1. Upload file first
const uploadFormData = new FormData();
uploadFormData.append("images", file);

const uploadResponse = await fetch("http://localhost:8000/api/uploads/images", {
  method: "POST",
  body: uploadFormData,
});

const { urls } = await uploadResponse.json();
const fileUrl = urls[0];

// 2. Later, use the URL wherever needed
await fetch("http://localhost:8000/api/users/123", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    profilePhoto: fileUrl,
  }),
});
```

## Configuration Options

### ArkosRouter Upload Configuration Reference
> Available from `v1.4.0-beta`

The `experimental.uploads` configuration object supports the following options:

| Property           | Type                                     | Description                              | Default                       |
| ------------------ | ---------------------------------------- | ---------------------------------------- | ----------------------------- |
| `type`             | `"single" \| "array" \| "fields"`        | Upload type                              | Required                      |
| `field`            | `string`                                 | Form field name (for single/array)       | Required for single/array     |
| `fields`           | `Array<{name: string, maxCount: number}>` | Field configs (for fields type)          | Required for fields type      |
| `uploadDir`        | `string`                                 | Directory to store files                 | Auto-detected by MIME type    |
| `maxSize`          | `number`                                 | Max file size in bytes                   | From global config            |
| `maxCount`         | `number`                                 | Max files (for array type)               | Required for array            |
| `allowedFileTypes` | `string[] \| RegExp`                     | Allowed file extensions/patterns         | From global config            |
| `attachToBody`     | `"pathname" \| "url" \| "file" \| false` | How to attach file info to req.body      | `"pathname"`                  |
| `deleteOnError`    | `boolean`                                | Delete uploaded files if request fails   | `false`                       |

### Global Configuration

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  fileUpload: {
    baseUploadDir: "/uploads",
    baseRoute: "/api/uploads",
    expressStatic: {
      maxAge: "1y",
      etag: true,
    },
    restrictions: {
      images: {
        maxCount: 10,
        maxSize: 5 * 1024 * 1024, // 5MB
        supportedFilesRegex: /\.(jpg|jpeg|png|gif|webp)$/,
      },
      videos: {
        maxCount: 5,
        maxSize: 100 * 1024 * 1024, // 100MB
        supportedFilesRegex: /\.(mp4|avi|mov|wmv)$/,
      },
      documents: {
        maxCount: 20,
        maxSize: 10 * 1024 * 1024, // 10MB
        supportedFilesRegex: /\.(pdf|doc|docx|txt)$/,
      },
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0">

```typescript
// src/app.ts
arkos.init({
  fileUpload: {
    baseUploadDir: "/uploads",
    baseRoute: "/api/uploads",
    expressStaticOptions: {
      maxAge: "1y",
      etag: true,
    },
    restrictions: {
      images: {
        maxCount: 10,
        maxSize: 5 * 1024 * 1024,
        supportedFilesRegex: /\.(jpg|jpeg|png|gif|webp)$/,
      },
      // ... other restrictions
    },
  },
});
```

</TabItem>
</Tabs>

## Image Processing

When uploading images, you can apply processing through query parameters or middleware configuration:

### Query Parameters (Traditional Endpoints)

- `?width=500` - Resize image to 500px width (may distort ratio, use resizeTo instead)
- `?height=300` - Resize image to 300px height (may distort ratio, use resizeTo instead)
- `?format=webp` - Convert image to WebP format
- `?resizeTo=800` - Resize image to fit within 800px (keeps ratio)

```typescript
// Example: Upload and resize an image
fetch("http://localhost:8000/api/uploads/images?width=500&format=webp", {
  method: "POST",
  body: formData,
});

// Example: Update an image with processing
fetch("http://localhost:8000/api/uploads/images/old-image.jpg?resizeTo=800&format=webp", {
  method: "PATCH",
  body: formData,
});
```

### Processing in Interceptor Middlewares

For auto-generated routes with ArkosRouter, apply processing in your interceptor middlewares:

```typescript
// src/modules/user/user.interceptors.ts
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const beforeCreateOne = [ async (
    req: ArkosRequest,
    res: ArkosResponse,
    next: ArkosNextFunction
) => {
        // Apply image processing for profile photos
        if (req.file && req.file.fieldname === "profilePhoto") {
            req.query.resizeTo = "500";
            req.query.format = "webp";
        }

        next();
    } ];

export const beforeUpdateOne = [ async (
    req: ArkosRequest,
    res: ArkosResponse,
    next: ArkosNextFunction
) => {
        // Same processing for updates
        if (req.file && req.file.fieldname === "profilePhoto") {
            req.query.resizeTo = "500";
            req.query.format = "webp";
        }

        next();
    } ];
```

:::warning Naming Conventions Update
Noticed the path `src/modules/user.user.interceptors.ts`? on `v1.4.0-beta` we rename the old `.middlewares.ts` files to better mean what the file actually do which is provide a way to intercept the auto generated routes even though using middlewares.

We did also to keep `.middlewares.ts` files as it as been used on express, to export dedicated middleware functions and not simply interceptors.
:::

## File Upload Interceptor Middlewares

Arkos provides a powerful middleware system that gives you complete control over the file upload request processing flow. These interceptors allow you to execute custom logic before and after each file operation.

### Available Interceptors

The middleware system provides interceptors for all file operations:

#### Upload Interceptors
- `beforeUploadFile` - Execute logic before file upload
- `afterUploadFile` - Execute logic after file upload

#### Update Interceptors  
- `beforeUpdateFile` - Execute logic before file update/replacement
- `afterUpdateFile` - Execute logic after file update/replacement

#### Delete Interceptors
- `beforeDeleteFile` - Execute logic before file deletion
- `afterDeleteFile` - Execute logic after file deletion

#### Find Interceptors
- `beforeFindFile` - Execute logic before file serving/retrieval

### How Interceptor Middlewares Work

The middleware system automatically chains your custom interceptors with the core file upload controller methods. Here's the execution flow:

```
Request → beforeUploadFile → Core Upload Logic → afterUploadFile → Response
```

### Implementing Interceptor Middlewares

Create interceptor middlewares in your file upload module:

```ts
// src/modules/file-upload/file-upload.interceptors
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

export const beforeUploadFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Custom validation before upload
  console.log("About to upload files:", req.files);
  
  // Add custom headers or modify request
  req.uploadMetadata = {
    uploadedBy: req.user?.id,
    uploadedAt: new Date(),
  };
  
  next();
};

export const afterUploadFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Custom logic after successful upload
  console.log("Files uploaded successfully:", req.responseData?.data);
  
  // Log to database, send notifications, etc.
  await logFileUpload(req.responseData?.data, req.user?.id); // your custom function
  
  next();
};

export const beforeUpdateFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  const { fileName } = req.params;
  
  // Check permissions or backup old file
  console.log(`About to replace file: ${fileName}`);
  
  // Store old file info for cleanup or rollback
  req.oldFileInfo = await getFileInfo(fileName);
  
  next();
};

export const afterUpdateFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Custom logic after file replacement
  console.log("File replacement completed");
  
  // Update database references or send notifications
  await updateFileReferences(req.oldFileInfo, req.responseData?.data);
  
  next();
};

export const beforeDeleteFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  const { fileName } = req.params;
  
  // Check if file is still referenced in database
  const isReferenced = await checkFileReferences(fileName);
  if (isReferenced) {
    return res.status(400).json({
      error: "Cannot delete file: still referenced in database"
    });
  }
  
  next();
};

export const afterDeleteFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Log deletion or clean up related data
  console.log("File deleted successfully");
  
  next();
};

export const beforeFindFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Add download tracking or access control
  console.log("File access requested:", req.params.fileName);
  
  // Track downloads
  await trackFileAccess(req.params.fileName, req.user?.id);
  
  next();
};
```

### Advanced Interceptor Examples

#### File Validation and Processing

```ts
export const beforeUploadFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  const files = req.files as Express.Multer.File[];
  
  // Custom file validation
  for (const file of files) {
    // Check file content (not just extension)
    if (file.mimetype.startsWith('image/')) {
      const isValidImage = await validateImageContent(file.buffer);
      if (!isValidImage) {
        return res.status(400).json({
          error: `Invalid image file: ${file.originalname}`
        });
      }
    }
    
    // Virus scanning
    const isSafe = await scanForViruses(file.buffer); // your custom function
    if (!isSafe) {
      return res.status(400).json({
        error: `Security threat detected in: ${file.originalname}`
      });
    }
  }
  
  next();
};
```

## Working with File Upload Services

For programmatic file operations within your controllers and services, you can use the file upload services directly. See the [File Upload Services Function Guide](/docs/api-reference/file-upload-services-function-guide) for detailed usage examples.

```ts
import { getFileUploadServices } from "arkos/services";

// Inside your controller or service
const imageUrl = await getFileUploadServices().imageUploadService.upload(
  req,
  res,
  {
    format: "webp",
    resizeTo: 500,
  }
);
```

## Default Supported Upload Files

### Image Files

Default supported formats include: jpeg, jpg, png, gif, webp, svg, bmp, tiff, heif, heic, ico, jfif, raw, cr2, nef, orf, sr2, arw, dng, pef, raf, rw2, psd, ai, eps, xcf, jxr, wdp, hdp, jp2, j2k, jpf, jpx, jpm, mj2, avif

**Default Restrictions:**
- Maximum count: 30 files
- Maximum size: 15 MB per file

### Video Files

Default supported formats include: mp4, avi, mov, mkv, flv, wmv, webm, mpg, mpeg, 3gp, m4v, ts, rm, rmvb, vob, ogv, dv, qt, asf, m2ts, mts, divx, f4v, swf, mxf, roq, nsv, mvb, svi, mpe, m2v, mp2, mpv, h264, h265, hevc

**Default Restrictions:**
- Maximum count: 10 files
- Maximum size: 5 GB per file

### Document Files

Default supported formats include: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odg, odp, txt, rtf, csv, epub, md, tex, pages, numbers, key, xml, json, yaml, yml, ini, cfg, conf, log, html, htm, xhtml, djvu, mobi, azw, azw3, fb2, lit, ps, wpd, wps, dot, dotx, xlt, xltx, pot, potx, oft, one, onetoc2, opf, oxps, hwp

**Default Restrictions:**
- Maximum count: 30 files
- Maximum size: 50 MB per file

### Other Files

By default, all other file types are supported with the following restrictions:

- Maximum count: 10 files
- Maximum size: 5 GB per file

## Customizing File Upload Restrictions

You can override the default file upload settings through your Arkos configuration:

<Tabs groupId="version">
<TabItem value="v1.4" label="v1.4.0+ (Recommended)" default>

```typescript
// arkos.config.ts
import { ArkosConfig } from "arkos";

const arkosConfig: ArkosConfig = {
  fileUpload: {
    restrictions: {
      images: {
        maxCount: 50,
        maxSize: 1024 * 1024 * 20, // 20 MB
        supportedFilesRegex: /jpeg|jpg|png/, // Only allow these image formats
      },
      videos: {
        maxCount: 5,
        maxSize: 1024 * 1024 * 1024 * 2, // 2 GB
        supportedFilesRegex: /mp4|mov|webm/,
      },
      documents: {
        maxCount: 20,
        maxSize: 1024 * 1024 * 100, // 100 MB
        supportedFilesRegex: /pdf|docx|xlsx/,
      },
      // Override other file type configurations as needed
    },
  },
};

export default arkosConfig;
```

</TabItem>
<TabItem value="v1.3" label="v1.3.0 and earlier">

```typescript
// src/app.ts
import arkos from "arkos";

arkos.init({
  fileUpload: {
    restrictions: {
      images: {
        maxCount: 50,
        maxSize: 1024 * 1024 * 20, // 20 MB
        supportedFilesRegex: /jpeg|jpg|png/, // Only allow these image formats
      },
      videos: {
        maxCount: 5,
        maxSize: 1024 * 1024 * 1024 * 2, // 2 GB
        supportedFilesRegex: /mp4|mov|webm/,
      },
      documents: {
        maxCount: 20,
        maxSize: 1024 * 1024 * 100, // 100 MB
        supportedFilesRegex: /pdf|docx|xlsx/,
      },
      // Override other file type configurations as needed
    },
  },
});
```

</TabItem>
</Tabs>
