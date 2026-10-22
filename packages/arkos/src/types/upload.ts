import type { ArkosFileInternalState } from "./internal";
import type { ArkosRequest } from "./index";

export type UploadDirParams = Record<string, string>;

export type UploadUrlPath = string | { exact: string };

/**
 * Resolves the disk parameters for an upload or serving folder.
 *
 * It is the only source of disk parameters. It may perform authorization and
 * throw to deny the request.
 */
export type UploadPrepare = (
  req: ArkosRequest,
  locals: Record<string, any>
) =>
  | { dirParams?: UploadDirParams }
  | Promise<{ dirParams?: UploadDirParams }>;

export type PrepareFileContext = {
  file: ArkosFile;
  dirParams: UploadDirParams;
  index: number;
};

/**
 * Resolves per-file data before a file is written. Only `filename` is
 * consumed; the file extension is always preserved.
 */
export type UploadPrepareFile = (
  context: PrepareFileContext,
  req: ArkosRequest,
  locals: Record<string, any>
) => { filename?: string } | Promise<{ filename?: string }>;

export interface ArkosFile extends Express.Multer.File {
  /**
   * The file pathname without the server host
   */
  pathname: string;
  /**
   * The file full URL
   */
  url: string;
  /**
   * @internal Upload metadata resolved by Arkos.
   */
  __arkos?: ArkosFileInternalState;
}
