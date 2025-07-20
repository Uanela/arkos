---
sidebar_position: 6
---

# Image Uploads

The **Arkos** image upload API provides a powerful way to handle image files with built-in optimization and processing capabilities.

## Default API Endpoint

```
POST /api/uploads/images
```

> The sent `multipart/form-data` body must contain the field `images` whether to upload single or multiple images.

## Features

- Upload multiple images at once
- Automatic image processing with Sharp
- Image resizing and format conversion
- Configurable file size limits and supported formats

## Request Parameters

| Query Parameter | Type   | Description                                                                   |
| --------------- | ------ | ----------------------------------------------------------------------------- |
| `width`         | number | Resize image to specified width                                               |
| `height`        | number | Resize image to specified height                                              |
| `format`        | string | Convert image to specified format (webp, jpeg, etc.)                          |
| `resizeTo`      | number | Resize image to fit within specified dimension while maintaining aspect ratio |

:::warning
Passing `width` or `height` may distort aspect ratio use `resizeTo` instead that will keep your aspect ratio by setting the passed value to the smallest side of image. If you want to pass `width` and `height` a keep ratio just pass the right measures.
:::

## Response Format

```json
{
  "success": true,
  "data": [
    "https://yourdomain.com/api/uploads/images/1681234567890-image.jpg",
    "https://yourdomain.com/api/uploads/images/1681234567891-image.jpg"
  ],
  "message": "2 files uploaded successfully"
}
```

## Supported Image Formats

By default, Arkos supports the following image formats:

- JPEG/JPG
- PNG
- GIF
- WebP
- SVG
- BMP
- TIFF
- HEIF/HEIC
- And many more professional formats (RAW, CR2, NEF, etc.)
- See more at [Default Supported Image Types](/docs/api-reference/default-supported-upload-files#image-files)

## Image Optimization

Arkos uses the [Sharp](https://sharp.pixelplumbing.com/) library to provide powerful image optimization capabilities:

1. **Resizing**: Adjust dimensions while maintaining aspect ratio
2. **Format Conversion**: Convert between formats (e.g., JPEG to WebP)
3. **Quality Optimization**: Reduce file size while maintaining visual quality

### Example: Optimizing an Image

```javascript
// Upload an image and convert it to WebP format with 500px width
const formData = new FormData();
formData.append("images", imageFile);

fetch("/api/uploads/images?resizeTo=500&format=webp", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => {
    // The URL in the response will point to the optimized image
    const optimizedImageUrl = data.data[0];
  });
```

## Custom Configuration

You can customize image upload settings in your Arkos initialization:

```javascript
arkos.init({
  fileUpload: {
    restrictions: {
      images: {
        maxCount: 50, // Maximum number of images per upload request
        maxSize: 1024 * 1024 * 20, // 20MB maximum file size
        supportedFilesRegex: /jpeg|jpg|png|webp/, // Only allow these formats
      },
    },
  },
});
```

## Deleting Images

To delete an uploaded image:

```
DELETE /api/uploads/images/:fileName
```

Where `:fileName` is the name of the file to delete (including extension).

### Example Response

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Authentication And Authorization

For details on how to configure video uploads authentication rules see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication).
