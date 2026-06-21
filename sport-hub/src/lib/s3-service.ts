import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

const REGION = "eu-central-1";
// const BUCKET_NAME = "images.isa-rankings.org";

const s3Client = new S3Client({
  region: REGION,
});

export async function listS3Buckets() {
  try {
    const command = new ListBucketsCommand({
      BucketRegion: REGION,
    });
    const response = await s3Client.send(command);
    return response.Buckets || [];
  } catch (error) {
    console.error("Error listing S3 buckets:", error);
    throw error;
  }
};
