---
sidebar_position: 10
---

# Default Supported Upload Files

**Arkos** provides built-in support for various file types across different categories. These default settings can be customized through configuration options.

### Image Files

Default supported formats include: jpeg, jpg, png, gif, webp, svg, bmp, tiff, heif, heic, ico, jfif, raw, cr2, nef, orf, sr2, arw, dng, pef, raf, rw2, psd, ai, eps, xcf, jxr, wdp, hdp, jp2, j2k, jpf, jpx, jpm, mj2, avif

**Default Restrictions:**

- Maximum count: 30 files
- Maximum size: 15 MB per file

More details see [Image uploads Guide](/docs/advanced-guide/images-uploads).

### Video Files

Default supported formats include: mp4, avi, mov, mkv, flv, wmv, webm, mpg, mpeg, 3gp, m4v, ts, rm, rmvb, vob, ogv, dv, qt, asf, m2ts, mts, divx, f4v, swf, mxf, roq, nsv, mvb, svi, mpe, m2v, mp2, mpv, h264, h265, hevc

**Default Restrictions:**

- Maximum count: 10 files
- Maximum size: 5 GB per file

More details see [Video uploads Guide](/docs/advanced-guide/videos-uploads).

### Document Files

Default supported formats include: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odg, odp, txt, rtf, csv, epub, md, tex, pages, numbers, key, xml, json, yaml, yml, ini, cfg, conf, log, html, htm, xhtml, djvu, mobi, azw, azw3, fb2, lit, ps, wpd, wps, dot, dotx, xlt, xltx, pot, potx, oft, one, onetoc2, opf, oxps, hwp

**Default Restrictions:**

- Maximum count: 30 files
- Maximum size: 50 MB per file

More details see [Document uploads Guide](/docs/advanced-guide/documents-uploads).

### Other Files

By default, all other file types are supported with the following restrictions:

- Maximum count: 10 files
- Maximum size: 5 GB per file

More details see [Other file uploads Guide](/docs/advanced-guide/other-files-uploads)

## Customizing File Upload Restrictions

You can override the default file upload settings by using the `arkos.init()` method:

```javascript
arkos.init({
  fileUpload: {
    restrictions: {
      images: {
        maxCount: 50,
        maxSize: 1024 * 1024 * 20, // 20 MB
        supportedFilesRegex: /jpeg|jpg|png/, // Only allow these image formats
      },
      // Override other file type configurations as needed
    },
  },
});
```

For detailed instructions on implementing file uploads for each specific file type, please refer to our dedicated guides mentioned below each file type description above.
