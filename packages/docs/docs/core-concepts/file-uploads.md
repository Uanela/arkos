---
sidebar_position: 5
---

# File Uploads

**Arkos** provides a robust file upload system out of the box that supports various file types including images, videos, and documents. The system is designed to be flexible and configurable to meet your application's needs.

## Overview

The file upload system in Arkos allows you to:

- Upload multiple files at once
- Update existing files with automatic old file cleanup
- Define file size limits and supported file types
- Process and optimize images (resize, format conversion)
- Delete uploaded files
- Configure custom upload directories
- Use interceptor middlewares for custom processing logic

## Available Endpoints

By default, Arkos exposes the following file upload endpoints:

- `POST /api/uploads/:fileType` - Upload files of a specific type
- `PATCH /api/uploads/:fileType/:fileName` - Update/replace existing files
- `DELETE /api/uploads/:fileType/:fileName` - Delete a specific file

Where `:fileType` can be one of:

- `images` - For image files
- `videos` - For video files
- `documents` - For document files
- `files` - For any other file type

## Basic File Operations

### Uploading Files

```ts
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
Pay attention to the FormData fields, even though we want to upload only one single image we must use the field as `images` and the same applies for other supported by default files (`videos`, `documents`) and overall `files`.
:::

### Updating/Replacing Files

The `PATCH /api/uploads/:fileType/:fileName` endpoint provides intelligent file replacement:

```ts
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

### Deleting Files

```ts
fetch("http://localhost:8000/api/uploads/images/1234567890-image.jpg", {
  method: "DELETE",
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## Image Processing

When uploading images, you can specify query parameters to resize or convert them:

- `?width=500` - Resize image to 500px width (may distort ratio, use resizeTo instead)
- `?height=300` - Resize image to 300px height (may distort ratio, use resizeTo instead)
- `?format=webp` - Convert image to WebP format
- `?resizeTo=800` - Resize image to fit within 800px (will keep this on the largest side of the image and keep ratio)

```javascript
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
// src/modules/file-upload/file-upload.middlewares.ts
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

#### Database Integration

```ts
export const afterUploadFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  const uploadedFiles = req.responseData?.data;
  
  // Save file metadata to database
  const fileRecords = uploadedFiles.map(url => ({
    url,
    uploadedBy: req.user?.id,
    fileType: req.params.fileType,
    originalName: req.files?.[0]?.originalname,
    size: req.files?.[0]?.size,
    uploadedAt: new Date(),
  }));
  
  await prisma.fileUpload.createMany({
    data: fileRecords
  });
  
  next();
};
```

#### Automatic Backup and Rollback

```ts
export const beforeUpdateFile = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  const { fileName } = req.params;
  
  // Create backup before replacement
  try {
    await createFileBackup(fileName); // your custom logic
    req.backupCreated = true;
  } catch (error) {
    console.warn("Could not create backup:", error);
    req.backupCreated = false;
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

For a complete API reference of the file upload controller methods, see the [File Upload Controller Object](/docs/api-reference/file-upload-controller-object).

## Custom Configuration

You can customize the file upload system by providing configuration options when initializing Arkos:

```javascript
import arkos from "arkos";

arkos.init({
  fileUpload: {
    // Change the base upload directory
    baseUploadDir: "/custom-uploads",

    // Change the base route for file uploads
    baseRoute: "/api/files",

    // Customize upload restrictions
    restrictions: {
      images: {
        maxCount: 50,
        maxSize: 1024 * 1024 * 20, // 20MB
        supportedFilesRegex: /jpeg|jpg|png|webp/,
      },
      // Add other file type configurations...
    },
  },
});
```

## Best Practices for File Management

### 1. Use the Auto-Update Endpoint

Instead of manually deleting old files and uploading new ones, use the `PATCH` endpoint:

```ts
// Good: Use auto-update endpoint
const formData = new FormData();
formData.append("images", newImageFile);

fetch("http://localhost:8000/api/uploads/images/old-image.jpg", {
  method: "PATCH",
  body: formData,
});
```

### 2. Implement Proper Error Handling

```ts
try {
  const response = await fetch("/api/uploads/images/old-image.jpg", {
    method: "PATCH",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  // Handle success
} catch (error) {
  // Handle error - old file is still intact
  console.error("File update failed:", error);
}
```

### 3. Model Integration with Interceptor Middlewares

```ts
// src/modules/post/post.middlewares.ts
import { getFileUploadServices } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { prisma } from "../../utils/prisma";

export const beforeUpdateOne = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Upload new image if provided
  const imageUrl = await getFileUploadServices().imageUploadService.upload(
    req,
    res,
    {
      format: "webp",
      resizeTo: 500,
    }
  );

  if (imageUrl) {
    req.body.image = imageUrl;

    // Get old image for cleanup
    const { image } = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { image: true },
    });

    req.query.ignoredFields = {
      oldImage: image,
    };
  }

  next();
};

export const afterUpdateOne = async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
  // Clean up old image after successful update
  if (req.body.image && req.query.ignoredFields?.oldImage) {
    getFileUploadServices()
      .imageUploadService.deleteByUrl(req.query.ignoredFields.oldImage)
      .catch((err) => {
        console.log("Failed to delete old image:", err);
      });
  }

  next();
};
```


## Authentication & Authorization

File upload endpoints respect the authentication and authorization rules you define. You can control access to file uploads using the same pattern as other API endpoints in **Arkos**.

### Key Differences In File Upload Authentication

#### 1. Static Role-Based Access Control

In Static RBAC, define the `AuthConfigs` under `src/modules/file-upload/file-upload.auth.ts` and apply the same rules. See [Static RBAC Auth Configs Guide](/docs/core-concepts/authentication-system#using-auth-config-to-customize-endpoint-behavior).

#### 2. Dynamic Role-Based Access Control

In Dynamic RBAC, define the `AuthPermission` with `resource` set to `file-upload` and the appropriate `action` (create, view, update, delete). See [Dynamic RBAC Auth Configs Guide](/docs/core-concepts/authentication-system#upgrading-to-dynamic-rbac#using-auth-config-to-customize-endpoint-behavior).

## Next Steps

For more detailed information on specific file types and advanced features:

- [Image Uploads](/docs/advanced-guide/images-uploads)
- [Video Uploads](/docs/advanced-guide/videos-uploads)  
- [Document Uploads](/docs/advanced-guide/documents-uploads)
- [Other Files Uploads](/docs/advanced-guide/other-files-uploads)
- [File Upload Authentication Guide](/docs/advanced-guide/file-uploads-authentication)
