import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

import { PackageServiceError, assertEnv } from './errors'

export interface SignatureStorageResult {
  key: string
  url: string
}

export interface SignatureStorage {
  storeSignature(packageId: string, signature: string): Promise<SignatureStorageResult>
}

interface ParsedSignature {
  buffer: Buffer
  contentType: string
  extension: string
}

function parseSignature(signature: string): ParsedSignature {
  if (signature.startsWith('data:')) {
    const match = signature.match(/^data:(.*?);base64,(.*)$/)
    if (!match) {
      throw new PackageServiceError('Invalid signature payload', 400)
    }

    const [, contentType, data] = match
    return {
      buffer: Buffer.from(data, 'base64'),
      contentType,
      extension: contentType.split('/')[1] ?? 'png',
    }
  }

  return {
    buffer: Buffer.from(signature, 'base64'),
    contentType: 'image/png',
    extension: 'png',
  }
}

export function createSignatureStorage(): SignatureStorage {
  const region = assertEnv(process.env.AWS_REGION, 'AWS_REGION')
  const accessKeyId = assertEnv(process.env.AWS_ACCESS_KEY_ID, 'AWS_ACCESS_KEY_ID')
  const secretAccessKey = assertEnv(
    process.env.AWS_SECRET_ACCESS_KEY,
    'AWS_SECRET_ACCESS_KEY'
  )
  const bucket =
    process.env.S3_SIGNATURE_BUCKET ?? process.env.AWS_S3_BUCKET ?? process.env.S3_BUCKET

  const bucketName = assertEnv(bucket, 'S3_SIGNATURE_BUCKET')
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return {
    async storeSignature(packageId: string, signature: string) {
      const { buffer, contentType, extension } = parseSignature(signature)
      const key = `packages/${packageId}/signatures/${randomUUID()}.${extension}`

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })

      await client.send(command)

      const url = publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
        : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`

      return { key, url }
    },
  }
}
