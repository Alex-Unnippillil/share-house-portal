import type { Area } from 'react-easy-crop'

export const CROPPED_IMAGE_SIZE = 512
const IMAGE_MIME_TYPE = 'image/jpeg'
const IMAGE_QUALITY = 0.9

export interface CroppedImageResult {
  blob: Blob
  dataUrl: string
}

export interface GenerateCroppedImageDependencies {
  loadImage?: (src: string) => Promise<HTMLImageElement>
  createCanvas?: () => HTMLCanvasElement
}

function defaultLoadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Failed to load image for cropping.')))
    image.src = src
  })
}

function defaultCreateCanvas() {
  return document.createElement('canvas')
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to produce cropped image blob.'))
          return
        }

        resolve(blob)
      },
      IMAGE_MIME_TYPE,
      IMAGE_QUALITY,
    )
  })
}

async function blobToDataUrl(blob: Blob) {
  if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
    return ''
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result)
    })
    reader.addEventListener('error', () => reject(new Error('Failed to generate preview data URL.')))
    reader.readAsDataURL(blob)
  })
}

export async function generateCroppedImage(
  src: string,
  pixelCrop: Area,
  outputSize: number,
  dependencies: GenerateCroppedImageDependencies = {},
): Promise<CroppedImageResult> {
  const loadImage = dependencies.loadImage ?? defaultLoadImage
  const createCanvas = dependencies.createCanvas ?? defaultCreateCanvas

  const image = await loadImage(src)
  const canvas = createCanvas()
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not access drawing context for cropping.')
  }

  const effectiveWidth = image.width || image.naturalWidth
  const effectiveHeight = image.height || image.naturalHeight
  const naturalWidth = image.naturalWidth || effectiveWidth
  const naturalHeight = image.naturalHeight || effectiveHeight

  const scaleX = naturalWidth / (effectiveWidth || naturalWidth || 1)
  const scaleY = naturalHeight / (effectiveHeight || naturalHeight || 1)

  const sourceX = pixelCrop.x * scaleX
  const sourceY = pixelCrop.y * scaleY
  const sourceWidth = pixelCrop.width * scaleX
  const sourceHeight = pixelCrop.height * scaleY

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputSize, outputSize)

  const blob = await canvasToBlob(canvas)
  const dataUrl =
    typeof canvas.toDataURL === 'function'
      ? canvas.toDataURL(IMAGE_MIME_TYPE, IMAGE_QUALITY)
      : await blobToDataUrl(blob)

  return { blob, dataUrl }
}
