import type { UploadConfig } from "../utils/arkos-router/types/upload-config";

import type { UploadDirParams } from "./upload";

export type ArkosFileInternalState = {
  uploadDir?: string;
  urlPath?: string;
  urlPathExact?: boolean;
  dirParams?: UploadDirParams;
  uploadPath?: string;
  targetPath?: string;
};

export type ArkosRequestInternalState = {
  uploadConfig?: UploadConfig;
  uploadDir?: string;
  uploadPath?: string;
  uploadKind?: "file" | "directory";
  preparedUploads?: Map<
    string,
    {
      dirParams: UploadDirParams;
      uploadDir: string;
      urlPath: string;
      urlPathExact: boolean;
    }
  >;
  uploadFileIndexes?: Record<string, number>;
  uploadTargetPaths?: Set<string>;
  uploadWrittenPaths?: string[];
};
