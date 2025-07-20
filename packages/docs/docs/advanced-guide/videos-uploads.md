---
sidebar_position: 7
---

# Video Uploads

**Arkos** provides built-in support for video file uploads with configurable size limits and supported format validation.

## Default API Endpoint

```
POST /api/uploads/videos
```

> The sent `multipart/form-data` body must contain the field `videos` whether to upload single or multiple videos.

## Features

- Upload multiple video files at once
- Configurable file size limits and supported formats
- Secure file storage and URL generation

## Response Format

```json
{
  "success": true,
  "data": [
    "https://yourdomain.com/api/uploads/videos/1681234567890-video.mp4",
    "https://yourdomain.com/api/uploads/videos/1681234567891-video.mov"
  ],
  "message": "2 files uploaded successfully"
}
```

## Supported Video Formats

By default, Arkos supports the following video formats:

- MP4
- AVI
- MOV
- MKV
- WebM
- FLV
- WMV
- And many other common formats
- See more at [Default Supported Video Types](/docs/api-reference/default-supported-upload-files#video-files)

:::info Future Enhancements
DASH and HLS adaptive streaming support with FFmpeg integration is planned for future releases. If you're interested in contributing to this feature, check out our GitHub repository at [GitHub](https://github.com/uanela/arkos).
:::

## Custom Configuration

You can customize video upload settings in your Arkos initialization:

```ts
// src/app.ts
arkos.init({
  fileUpload: {
    restrictions: {
      videos: {
        maxCount: 5, // Maximum number of videos per upload
        maxSize: 1024 * 1024 * 1024 * 2, // 2GB maximum file size
        supportedFilesRegex: /mp4|mov|webm/, // Only allow these formats
      },
    },
  },
});
```

## Deleting Videos

To delete an uploaded video:

```
DELETE /api/uploads/videos/:fileName
```

Where `:fileName` is the name of the file to delete (including extension).

### Example Response

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Best Practices

1. **File Size Limits**: Be mindful of your server's storage capacity and consider implementing frontend validation to prevent extremely large uploads
2. **Format Validation**: Restrict uploads to formats that your application can actually process
3. **Authentication**: Always protect your upload endpoints with proper authentication to prevent abuse

## Authentication And Authorization

For details on how to configure video uploads authentication rules see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication).
