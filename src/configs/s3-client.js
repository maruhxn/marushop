import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET_NAME = process.env.BUCKET_NAME || "TEST BUCET NAME";

export const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});
