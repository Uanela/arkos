---
sidebar_position: 9
---

# File Upload Services Function

The `getFileUploadServices` function provides a centralized way to handle file uploads in your **Arkos** application. It creates and returns specialized file uploader services for different file types (images, videos, documents, and general files), each preconfigured with appropriate size limits, file type validation, and processing capabilities.

## Key Features

- **Type-specific uploaders**: Separate services for images, videos, documents, and general files
- **Automatic configuration**: Uses your **Arkos** config settings or falls back to sensible defaults
- **Image processing**: Built-in image resizing and format conversion via Sharp
- **Flexible upload options**: Support for both single and multiple file uploads
- **URL generation**: Automatically generates accessible URLs for uploaded files
- **File deletion**: Ability to delete files using their URLs

## When to Call `getFileUploadServices`

Always call `getFileUploadServices` inside a function or route handler, not at the module level. This ensures that your **Arkos** configuration is fully loaded before the services are initialized.

```typescript
// ❌ Don't do this at the module level
const uploaders = getFileUploadServices(); // May use incomplete config

// ✅ Do this inside a function or route handler
function handleUpload() {
  const uploaders = getFileUploadServices(); // Configuration is ready
  // Use uploaders here
}
```

## Basic Usage

### Using in Custom Middlewares

The recommended approach is to use the uploader services in custom middlewares. This gives you full control over the upload process and integration with your business logic:

```typescript
// src/modules/post/post.middlewares.ts
import { getFileUploadServices } from "arkos/services";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";
import { prisma } from "../../utils/prisma";

export const beforeUpdateOne = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    // Uploads the image if it exists in request
    // NB: always call the getFileUploadServices inside a function not outside
    const imageUrl = await getFileUploadServices().imageUploadService.upload(
      req,
      res,
      {
        format: "webp",
        resizeTo: 500,
      }
    );

    // Checks if an image was uploaded, if yes attach it to the body
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

      // When you want to pass data to afterX middleware you can do this
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
        .imageUploadService.deleteFileByUrl(req.query.ignoredFields.oldImage)
        .catch((err) => {
          console.log(err);
        });

    next();
  }
);
```

### Using in Custom Routes

For direct use in routes:

```typescript
import { Router } from "express";
import { getFileUploadServices } from "arkos/services";
import { catchAsync } from "arkos/error-handler";

const router = Router();

router.post(
  "/upload-avatar",
  catchAsync(async (req, res, next) => {
    const { imageUploadService } = getFileUploadServices();

    const imageUrl = await imageUploadService.upload(req, res, {
      format: "webp",
      resizeTo: 300,
    });

    res.status(200).json({
      status: "success",
      data: { avatarUrl: imageUrl },
    });
  })
);

export default router;
```

## Available Services

The `getFileUploadServices` function returns an object with four specialized services:

```typescript
const {
  imageUploadService,
  videoUploadService,
  documentUploadService,
  fileUploadService,
} = getFileUploadServices();
```

| Service                 | Purpose              | Default Size Limit | File Types                           |
| ----------------------- | -------------------- | ------------------ | ------------------------------------ |
| `imageUploadService`    | For image uploads    | 15 MB              | jpeg, jpg, png, gif, webp, svg, etc. |
| `videoUploadService`    | For video uploads    | 5 GB               | mp4, avi, mov, mkv, webm, etc.       |
| `documentUploadService` | For document uploads | 50 MB              | pdf, doc, docx, xls, xlsx, etc.      |
| `fileUploadService`     | For any file type    | 5 GB               | All file types                       |

## Upload Methods

Each service provides methods for handling file uploads:

### Single File Upload

```typescript
export const uploadProfilePicture = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { imageUploadService } = getFileUploadServices();

    // Using the upload method
    const imageUrl = await imageUploadService.upload(req, res);

    // Update user profile with the new image URL
    await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: imageUrl },
    });

    res.status(200).json({
      status: "success",
      data: { profilePicture: imageUrl },
    });
  }
);
```

### Multiple Files Upload

```typescript
export const uploadProductGallery = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { imageUploadService } = getFileUploadServices();

    // Set multiple=true in the query parameters
    req.query.multiple = "true";

    // Upload multiple images
    const imageUrls = await imageUploadService.upload(req, res);

    // Update product with the new gallery URLs
    await prisma.product.update({
      where: { id: req.params.id },
      data: { gallery: { set: imageUrls } },
    });

    res.status(200).json({
      status: "success",
      data: { gallery: imageUrls },
    });
  }
);
```

### Image Processing Options

When uploading images, you can provide additional options for processing:

```typescript
export const uploadWithProcessing = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { imageUploadService } = getFileUploadServices();

    // Upload and process the image
    const imageUrl = await imageUploadService.upload(req, res, {
      // Convert to WebP format
      format: "webp",

      // Resize to specific dimensions
      width: 800,
      height: 600,

      // Or resize proportionally (maintaining aspect ratio)
      // resizeTo: 1200 // Resize so the smaller dimension equals this value
    });

    res.status(200).json({
      status: "success",
      data: { photoUrl: imageUrl },
    });
  }
);
```

## Middleware-Based Upload Methods

For more control over the upload process, you can also use the middleware-based methods:

```typescript
import { Router } from "express";
import { getFileUploadServices } from "arkos/services";

const router = Router();

router.post(
  "/upload-document",
  // This creates middleware that handles the upload but doesn't complete the response
  (req, res, next) => {
    const { documentUploadService } = getFileUploadServices();
    documentUploadService.handleSingleUpload()(req, res, next);
  },
  (req, res) => {
    // The file is now available in req.file
    const fileUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/uploads/documents/${req.file.filename}`;

    res.status(200).json({
      status: "success",
      data: { fileUrl },
    });
  }
);

export default router;
```

## Deleting Files

To delete a previously uploaded file:

```typescript
export const deleteProfilePicture = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { user } = req;

    // Get the current profile picture URL
    const { profilePicture } = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePicture: true },
    });

    if (profilePicture) {
      // Delete the file
      const { imageUploadService } = getFileUploadServices();
      await imageUploadService.deleteFileByUrl(profilePicture);

      // Update the user record
      await prisma.user.update({
        where: { id: user.id },
        data: { profilePicture: null },
      });
    }

    res.status(200).json({
      status: "success",
      message: "Profile picture deleted successfully",
    });
  }
);
```

## Configuration

The uploader services are automatically configured based on your Arkos configuration. You can customize the behavior by setting options in your configuration:

```ts
// src/app.ts
arkos.init({
  fileUpload: {
    baseUploadDir: "./uploads", // Base directory for uploads
    baseRoute: "/api/uploads", // Base URL route for accessing files
    restrictions: {
      images: {
        maxCount: 50, // Maximum images per upload
        maxSize: 1024 * 1024 * 20, // 20 MB
        supportedFilesRegex: /jpeg|jpg|png|gif|webp/, // Allowed file types
      },
      // Similarly for video, document, and other
    },
  },
  // other configs
});
```

## Error Handling

The uploader services throw appropriate error objects when issues occur. You can use Arkos's `catchAsync` utility to handle these errors:

```typescript
import { catchAsync } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";

// This is a custom middleware and not an Arkos interceptor middleware
export const uploadUserDocument = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { documentUploadService } = getFileUploadServices();
    const documentUrl = await documentUploadService.upload(
      req,
      res,
      "document"
    );

    res.status(200).json({
      status: "success",
      data: { documentUrl },
    });
  }
);
```

## Best Practices

1. **Always call `getFileUploadServices` inside functions**, not at the module level
2. **Select the right service** for the file type you're handling
3. **Validate files on the client-side** before upload to improve user experience
4. **Set appropriate file size limits** to prevent server overload
5. **Handle errors properly** to provide meaningful feedback to users
6. **Clean up old files** when they're no longer needed
7. **Use middleware patterns** to separate upload logic from business logic

## Advanced: Client-Side Integration Example

Here's an example of how to integrate with the uploader services from the frontend:

```javascript
// React example with axios
async function uploadProfileImage(file) {
  const formData = new FormData();
  formData.append("images", file);
  // even though it's one image the field must be images
  //  (others: videos, documents, files)

  try {
    const response = await axios.post("/api/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // For image processing options
      params: {
        format: "webp",
        resizeTo: 1200,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error(
      "Upload failed:",
      error.response?.data?.message || error.message
    );
    throw error;
  }
}
```

## Common Use Cases

### User Profile Pictures

```typescript
export const updateProfilePicture = catchAsync(
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    const { imageUploadService } = getFileUploadServices();

    // Upload and optimize the profile picture
    const imageUrl = await imageUploadService.upload(req, res, {
      format: "webp",
      resizeTo: 300, // Create a reasonably sized profile picture
    });

    if (imageUrl) {
      // Get the old profile picture to delete it later
      const { profilePicture } = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { profilePicture: true },
      });

      // Update the user's profile picture
      await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePicture: imageUrl },
      });

      // Delete the old profile picture if it exists
      if (profilePicture) {
        imageUploadService.deleteFileByUrl(profilePicture).catch((err) => {
          console.error("Failed to delete old profile picture:", err);
        });
      }

      res.status(200).json({
        status: "success",
        data: { profilePicture: imageUrl },
      });
    } else {
      res.status(400).json({
        status: "error",
        message: "No file uploaded",
      });
    }
  }
);
```

## Troubleshooting

### Common Issues

1. **"No file uploaded" error**
   - Ensure the form has `enctype="multipart/form-data"`
   - Check that the field name matches what your server expects

2. **"Invalid file type" error**
   - The file type isn't in the allowed types list
   - Verify the file extension and MIME type

3. **"File too large" error**
   - The file exceeds the configured size limit
   - Adjust the size limits in your configuration

4. **Configuration not being applied**
   - Make sure you're calling `getFileUploadServices` inside a function
   - Verify your Arkos configuration is properly set up

### Debug Tips

If you're having issues, try logging the following:

```typescript
console.log("File uploader config:", getArkosConfig().fileUpload);
console.log("Uploaded file:", req.file); // For single file uploads
console.log("Uploaded files:", req.files); // For multiple file uploads
```

By following this guide, you should be able to effectively use the file uploader services in your **Arkos** application for all your file handling needs.
