---
sidebar_position: 5
---

# File Uploads

**Arkos** provides a robust file upload system out of the box that supports various file types including images, videos, and documents. The system is designed to be flexible and configurable to meet your application's needs.

## Overview

The file upload system in Arkos allows you to:

- Upload multiple files at once
- Define file size limits and supported file types
- Process and optimize images (resize, format conversion)
- Delete uploaded files
- Configure custom upload directories

## Basic Usage

By default, Arkos exposes the following file upload endpoints:

- `POST /api/uploads/:fileType` - Upload files of a specific type
- `DELETE /api/uploads/:fileType/:fileName` - Delete a specific file

Where `:fileType` can be one of:

- `images` - For image files
- `videos` - For video files
- `documents` - For document files
- `files` - For any other file type

### Example: Uploading Images

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
Pay attention to the FormData fields, even though we want to upload only one single image we must the field as `images` and the same applies for other supported by default files (`videos`, `documents`) and overall `files`.
:::

:::tip
To upload and manipulate other file types only changes from `images` to other file types for example `videos`.
:::

### Example: Uploading Videos

```ts
// Using fetch API
const formData = new FormData();
formData.append("videos", videoFile);

fetch("http://localhost:8000/api/uploads/videos", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### Example: Deleting a File

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
```

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

### Best Practices for File Updates

When implementing file updates in your application:

1. If you're replacing a file that's referenced by a model, update the model reference first after successful upload of the new file
2. Delete the old file only after confirming the model reference has been successfully updated because of storage concerns (up to your server) and also makes no sense to keep a file that will no longer be used
3. Consider implementing a transaction-like pattern to ensure atomicity of these operations

#### Handling File And Model Relation On Frontend

1. You can first upload the new images making a post request to the images upload endpoint
2. Then take the provided URL and try to update the desired post (just an example)
3. If everything goes right make a DELETE request to delete the old image
4. If it fails to update the post, makes and DELETE request to the new uploaded image file

#### Handling File And Model Relation On Server

```ts
// src/modules/post/post.middlewares.ts
import { getFileUploadServices } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const beforeUpdateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Uploads the image if it haves anything in request
    // NB: always call the getFileUploadServices inside a function not outside
    const imageUrl = await getFileUploadServices().imageUploadService.upload(
      req,
      res,
      {
        format: "webp",
        resizeTo: 500,
      }
    );

    // Checks if a image was uploaded, if yest attach it to the body
    if (imageUrl) {
      req.body.image = imageUrl;

      const { image } = await prisma.post.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          image: true,
        },
      });

      // When want to pass data to afterX middleware you can do this
      req.query.ignoredFields = {
        oldImage: image,
      };
    }

    next();
  }
);

export const afterUpdateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Checks if a file was uploaded by checking the req.body.image field
    // If yes delete the old one
    if (req.body.image)
      getFileUploadServices()
        .imageUploadService.deleteByUrl(req.query.ignoreFields.oldImage)
        .catch((err) => {
          console.log(err);
        });

    next();
  }
);
```

You can refer to the [getFileUploadServices Function Guide](/docs/api-reference/file-upload-services-function-guide) for more guidance.

:::tip important
You could even revert the updated post and throw an error if failed to delete the old image, but here we just let it go because it was already changed and if old was delete or not only matters to the admin of the server.
:::

## Authentication & Authorization

File upload endpoints respect the authentication and authorization rules you define in your prisma models. You can control access to file uploads using the same pattern as other API endpoints in **Arkos**, read the full guide at [File Upload Authentication Upload Guide](/docs/advanced-guide/file-uploads-authentication.md).

### Key Differences In File Upload Authentication From Prisma Models

#### 1. Static Role-Based Acess Control

In Static RBAC ([See Guide](/docs/advanced-guide/static-rbac-authentication)) you define the `AuthConfigs` under `src/modules/[model-name]/[model-name].auth-configs.ts` you put it under `src/modules/file-upload/file-upload.auth-configs.ts` and apply the same rules, see [Static RBAC Auth Configs Guide](/docs/advanced-guide/static-rbac-authentication#using-auth-config-to-customize-endpoint-behavior).

#### 2. Dynamic Role-Based Acess Control

In Dynamic RBAC ([See Guide](/docs/advanced-guide/dynamic-rbac-authentication)) you define the `AuthPermission` with `resource` (for prisma model name) and `action` (create, view, update, delete). So on `resource` field of `AuthPermission` you pass `file-upload` and the rest is the same rules, see [Dynamic RBAC Auth Configs Guide](/docs/advanced-guide/dynamic-rbac-authentication#using-auth-config-to-customize-endpoint-behavior).

## Next Steps

For more detailed information on specific file types, check the API reference:

- [Image Uploads](/docs/advanced-guide/images-uploads)
- [Video Uploads](/docs/advanced-guide/videos-uploads)
- [Document Uploads](/docs/advanced-guide/documents-uploads)
- [Other Files Uploads](/docs/advanced-guide/other-files-uploads)
