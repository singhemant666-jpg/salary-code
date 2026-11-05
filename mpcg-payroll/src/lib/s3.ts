import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucketName =
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME ||
  process.env.S3_BUCKET_NAME ||
  '';

const region =
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'ap-south-1';

function getS3Client(): S3Client | null {
  if (!bucketName) return null;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
      ...(process.env.AWS_S3_ENDPOINT ? { endpoint: process.env.AWS_S3_ENDPOINT } : {}),
    });
  }

  // Fallback: Default AWS credential chain (e.g. EC2 IAM Instance Profile / Role)
  return new S3Client({
    region,
    ...(process.env.AWS_S3_ENDPOINT ? { endpoint: process.env.AWS_S3_ENDPOINT } : {}),
  });
}

export function isS3Configured(): boolean {
  return Boolean(bucketName);
}

export function getS3BucketName(): string {
  return bucketName;
}

export function getS3Region(): string {
  return region;
}

/**
 * Upload any file buffer to AWS S3.
 */
export async function uploadFileToS3(
  key: string,
  buffer: Buffer,
  contentType = 'application/octet-stream'
): Promise<{ success: boolean; key: string; s3Url?: string; error?: string }> {
  const client = getS3Client();
  if (!client || !bucketName) {
    return { success: false, key, error: 'S3 is not configured (missing AWS_S3_BUCKET_NAME)' };
  }

  try {
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: 'inline',
      })
    );

    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
    return { success: true, key: cleanKey, s3Url };
  } catch (error: any) {
    console.error('[S3] Failed to upload file to S3:', error);
    return { success: false, key, error: error?.message || String(error) };
  }
}

/**
 * Download any file buffer directly from S3.
 */
export async function getFileBufferFromS3(key: string): Promise<Buffer | null> {
  const client = getS3Client();
  if (!client || !bucketName) return null;

  try {
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
    if (!response.Body) return null;
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (error) {
    console.warn('[S3] Failed to download buffer from S3 for key:', key, error);
    return null;
  }
}

/**
 * Check if a file exists in S3.
 */
export async function checkFileExistsInS3(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !bucketName) return false;

  try {
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from S3.
 */
export async function deleteFileFromS3(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client || !bucketName) return false;

  try {
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
    return true;
  } catch (error) {
    console.warn('[S3] Failed to delete object from S3:', key, error);
    return false;
  }
}

/**
 * Generate a pre-signed download / view URL for a file in S3.
 * Default expiration: 1 hour (3600 seconds).
 */
export async function getFilePresignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getS3Client();
  if (!client || !bucketName) return null;

  try {
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.warn('[S3] Failed to generate presigned URL for key:', key, error);
    return null;
  }
}

// ============================================================
// SALARY SLIP S3 ALIASES (Backward compatibility)
// ============================================================

export async function uploadSalarySlipToS3(
  key: string,
  buffer: Buffer,
  contentType = 'application/pdf'
) {
  return uploadFileToS3(key, buffer, contentType);
}

export async function getSalarySlipPresignedUrl(key: string, expiresInSeconds = 3600) {
  return getFilePresignedUrl(key, expiresInSeconds);
}

export async function getSalarySlipBufferFromS3(key: string) {
  return getFileBufferFromS3(key);
}

export async function deleteSalarySlipFromS3(key: string) {
  return deleteFileFromS3(key);
}

// ============================================================
// EMPLOYEE DOCUMENTS S3 ALIASES
// ============================================================

export async function uploadEmployeeDocumentToS3(
  key: string,
  buffer: Buffer,
  contentType: string
) {
  return uploadFileToS3(key, buffer, contentType);
}

export async function getEmployeeDocumentBufferFromS3(key: string) {
  return getFileBufferFromS3(key);
}

export async function deleteEmployeeDocumentFromS3(key: string) {
  return deleteFileFromS3(key);
}

export async function getEmployeeDocumentPresignedUrl(key: string, expiresInSeconds = 3600) {
  return getFilePresignedUrl(key, expiresInSeconds);
}
