import AWS from "aws-sdk";
const s3 = new AWS.S3({ region: "af-south-1" });

export async function uploadBufferToS3(
  buffer: Buffer,
  mimeType: string,
  bucket: string,
  filename: string
): Promise<string> {
  const extension = mimeType.split("/")[1];
  const key = `${filename}-${Date.now()}.${extension}`;

  const result = await s3
    .upload({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
    .promise();

  return result.Location;
}

