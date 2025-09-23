import { describe, expect, it, vi } from 'vitest'

import { CROPPED_IMAGE_SIZE, generateCroppedImage } from '@/utils/crop-image'

const pixelCrop = { x: 10, y: 20, width: 100, height: 100 }

describe('generateCroppedImage', () => {
  it('produces a square canvas output for avatars', async () => {
    const drawImage = vi.fn()
    const toBlob = vi.fn((callback: BlobCallback) => callback(new Blob(['avatar'], { type: 'image/jpeg' })))
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,preview')

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob,
      toDataURL,
    } as unknown as HTMLCanvasElement

    const loadImage = vi.fn(async () =>
      ({
        width: 400,
        height: 400,
        naturalWidth: 800,
        naturalHeight: 800,
      }) as unknown as HTMLImageElement,
    )

    const result = await generateCroppedImage('data:image/png;base64,avatar', pixelCrop, CROPPED_IMAGE_SIZE, {
      loadImage,
      createCanvas: () => canvas,
    })

    expect(loadImage).toHaveBeenCalledTimes(1)
    expect((canvas as unknown as { width: number }).width).toBe(CROPPED_IMAGE_SIZE)
    expect((canvas as unknown as { height: number }).height).toBe(CROPPED_IMAGE_SIZE)

    const callArgs = drawImage.mock.calls[0]
    expect(callArgs[1]).toBe(20)
    expect(callArgs[2]).toBe(40)
    expect(callArgs[3]).toBe(200)
    expect(callArgs[4]).toBe(200)
    expect(callArgs[5]).toBe(0)
    expect(callArgs[6]).toBe(0)
    expect(callArgs[7]).toBe(CROPPED_IMAGE_SIZE)
    expect(callArgs[8]).toBe(CROPPED_IMAGE_SIZE)

    expect(result.dataUrl).toBe('data:image/jpeg;base64,preview')
    expect(result.blob).toBeInstanceOf(Blob)
  })
})
