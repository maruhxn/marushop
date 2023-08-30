import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { s3 } from "../configs/s3-client.js";

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.BUCKET_NAME,
    key(req, file, cb) {
      cb(
        null,
        `product-images/${Date.now()}_${path.basename(file.originalname)}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
