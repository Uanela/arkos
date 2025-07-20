---
sidebar_position: 9
---

# Other Files Uploads

**Arkos** provides seamless handling of general file uploads with configurable size limits and format validation for files not specifically categorized as images, videos, or documents.

## Default API Endpoint

```
POST /api/uploads/files
```

> The sent `multipart/form-data` body must contain the field `files` whether to upload single or multiple files.

## Features

- Upload multiple general files at once
- Configurable file size limits and supported formats
- Secure file storage and URL generation

## Response Format

```json
{
  "success": true,
  "data": [
    "https://yourdomain.com/api/uploads/files/1681234567890-archive.zip",
    "https://yourdomain.com/api/uploads/files/1681234567891-custom.dat"
  ],
  "message": "2 files uploaded successfully"
}
```

## Commonly Used General File Types

General files can include various formats not specifically covered by the dedicated document, image, or video uploads:

- Archives (ZIP, RAR, TAR, GZ)
- Audio files (MP3, WAV, FLAC)
- Application files (EXE, APP)
- Source code files (JS, PHP, PY, JAVA)
- Binary data files (DAT, BIN)
- CAD files (DWG, DXF)
- Font files (TTF, OTF)
- And many other file types not categorized elsewhere

## Custom Configuration

You can customize general file upload settings in your Arkos initialization:

```ts
// src/app.ts
arkos.init({
  fileUpload: {
    restrictions: {
      files: {
        maxCount: 10, // Maximum number of files per upload
        maxSize: 1024 * 1024 * 200, // 200MB maximum file size
        supportedFilesRegex: /zip|rar|mp3|wav/, // Only allow these formats
      },
    },
  },
});
```

## Deleting Files

To delete an uploaded file:

```
DELETE /api/uploads/files/:fileName
```

Where `:fileName` is the name of the file to delete (including extension).

### Example Response

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Security Considerations

1. **File Type Validation**: Arkos validates file extensions and performs basic MIME type checking when possible
2. **Authorization**: File uploads respect the authentication and authorization rules you define in your models - see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication)
3. **Size Limits**: Default size limits are in place to prevent denial of service attacks
4. **Executable Content**: By default, certain potentially dangerous file types may be restricted

## Use Cases

- Application resource files
- User-generated content
- Generic attachments
- Software distribution
- Data exchange
- Audio content management

## Authentication And Authorization

For details on how to configure general file uploads authentication rules see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication).
