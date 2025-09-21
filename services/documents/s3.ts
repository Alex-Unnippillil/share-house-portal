import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3SignerConfig {
  region: string;
  bucket: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

export interface ObjectSigner {
  createUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<SignedUrl>;
  createDownloadUrl(key: string, expiresInSeconds?: number): Promise<SignedUrl>;
}

const clientCache = new WeakMap<S3SignerConfig, S3Client>();

const defaultExpirySeconds = 900;

const resolveClient = (config: S3SignerConfig): S3Client => {
  let client = clientCache.get(config);
  if (client) {
    return client;
  }

  client = new S3Client({
    region: config.region,
    credentials: config.credentials,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
  });

  clientCache.set(config, client);
  return client;
};

export class AwsS3Signer implements ObjectSigner {
  constructor(private readonly config: S3SignerConfig) {}

  private get client(): S3Client {
    return resolveClient(this.config);
  }

  async createUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<SignedUrl> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });

    const expiresIn = expiresInSeconds ?? defaultExpirySeconds;
    const url = await getSignedUrl(this.client, command, { expiresIn });

    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }

  async createDownloadUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<SignedUrl> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const expiresIn = expiresInSeconds ?? defaultExpirySeconds;
    const url = await getSignedUrl(this.client, command, { expiresIn });

    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }
}
