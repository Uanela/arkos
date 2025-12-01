import express from "express";
import { Options as MulterOptions } from "multer";

export type BodyParserConfig =
  | { parser: "json"; options?: Parameters<typeof express.json>[0] }
  | {
      parser: "urlencoded";
      options?: Parameters<typeof express.urlencoded>[0];
    }
  | { parser: "raw"; options?: Parameters<typeof express.raw>[0] }
  | { parser: "multipart"; options?: MulterOptions["limits"] }
  | { parser: "text"; options?: Parameters<typeof express.text>[0] };
