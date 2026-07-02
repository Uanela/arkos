export interface ArkosFile extends Express.Multer.File {
  /**
   * The file pathname without the server host
   */
  pathname?: string;
  /**
   * The file full URL
   */
  url?: string;
}
