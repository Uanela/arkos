---
sidebar_position: 8
---

# Document Uploads

**Arkos** provides seamless handling of document file uploads with configurable size limits and supported format validation.

## Default API Endpoint

```
POST /api/uploads/documents
```

> The sent `multipart/form-data` body must contain the field `documents` whether to upload single or multiple documents.

## Features

- Upload multiple document files at once
- Configurable file size limits and supported formats
- Secure file storage and URL generation

## Response Format

```json
{
  "success": true,
  "data": [
    "https://yourdomain.com/api/uploads/documents/1681234567890-document.pdf",
    "https://yourdomain.com/api/uploads/documents/1681234567891-document.docx"
  ],
  "message": "2 files uploaded successfully"
}
```

## Supported Document Formats

By default, Arkos supports the following document formats:

- PDF
- Microsoft Office (DOC, DOCX, XLS, XLSX, PPT, PPTX)
- OpenDocument formats (ODT, ODS, ODP)
- Text files (TXT, RTF, MD)
- Data files (CSV, JSON, XML, YAML)
- E-book formats (EPUB, MOBI)
- And many more document types
- See more at [Default Supported Document Types](/docs/api-reference/default-supported-upload-files#document-files)

## Custom Configuration

You can customize document upload settings in your Arkos initialization:

```ts
// src/app.ts
arkos.init({
  fileUpload: {
    restrictions: {
      documents: {
        maxCount: 20, // Maximum number of documents per upload
        maxSize: 1024 * 1024 * 100, // 100MB maximum file size
        supportedFilesRegex: /pdf|docx|xlsx/, // Only allow these formats
      },
    },
  },
});
```

## Deleting Documents

To delete an uploaded document:

```
DELETE /api/uploads/documents/:fileName
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

1. **File Type Validation**: Arkos validates both MIME types and file extensions to prevent upload of malicious files
2. **Authorization**: Document uploads respect the authentication and authorization rules you define in your models see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication)
3. **Size Limits**: Default size limits are in place to prevent denial of service attacks

## Use Cases

- User profile document attachments
- Report uploads
- Legal document management
- Content management systems
- Educational platforms

## Authentication And Authorization

For details on how to configure video uploads authentication rules see [File Uploads Authentication Guide](/docs/advanced-guide/file-uploads-authentication).
