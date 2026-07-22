import arkos, { ArkosRequest } from "arkos";
import { z } from "zod";

const app = arkos();

app.set("trust proxy", 1);

app.post(
  {
    path: "/test-upload-single-one-level",
    validation: { body: z.object({}) },
    experimental: {
      uploads: {
        type: "fields",
        fields: [{ name: "banner[][image]", minCount: 1 }],
      },
    },
  },
  (req, res) => {
    console.log("body", req.body);
    console.log("file", req.file);
    console.log("files", req.files);
    res.json({ body: req.body, file: req.file, files: req.files });
  }
);

app.listen();

// console.log(field, type, required, minCount, maxCount, allowedFileTypes, maxSize)
