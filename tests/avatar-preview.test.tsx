import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ChangeEvent } from 'react'

import { useAvatarCropper } from '@/hooks/use-avatar-cropper'
import { CROPPED_IMAGE_SIZE } from '@/utils/crop-image'

const originalFileReader = global.FileReader

class FileReaderMock {
  public result: string | ArrayBuffer | null = null
  public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null

  public addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'load' && typeof listener === 'function') {
      this.onload = listener as (this: FileReader, ev: ProgressEvent<FileReader>) => unknown
    }
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  public removeEventListener() {}

  public readAsDataURL() {
    this.result = 'data:image/png;base64,original'
    if (this.onload) {
      this.onload.call(this as unknown as FileReader, { target: this } as ProgressEvent<FileReader>)
    }
  }
}

const generateCroppedImageMock = vi.fn(() =>
  Promise.resolve({
    blob: new Blob(['avatar'], { type: 'image/jpeg' }),
    dataUrl: 'data:image/jpeg;base64,cropped',
  }),
)

vi.mock('@/utils/crop-image', async () => {
  const actual = await vi.importActual<typeof import('@/utils/crop-image')>('@/utils/crop-image')
  return {
    ...actual,
    generateCroppedImage: (...args: Parameters<typeof actual.generateCroppedImage>) =>
      generateCroppedImageMock(...args),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  global.FileReader = FileReaderMock as unknown as typeof FileReader
})

afterEach(() => {
  global.FileReader = originalFileReader
})

describe('useAvatarCropper', () => {
  it('creates a cropped preview when the user selects an image and adjusts the crop', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useAvatarCropper({ onError }))

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await act(async () => {
      const event = {
        target: {
          files: [file],
          value: '',
        },
      } as unknown as ChangeEvent<HTMLInputElement>
      result.current.handleFileChange(event)
    })

    expect(result.current.isDialogOpen).toBe(true)
    expect(onError).not.toHaveBeenCalled()

    act(() => {
      result.current.handleCropComplete(
        { x: 0, y: 0, width: CROPPED_IMAGE_SIZE, height: CROPPED_IMAGE_SIZE },
        { x: 0, y: 0, width: CROPPED_IMAGE_SIZE, height: CROPPED_IMAGE_SIZE },
      )
    })

    await waitFor(() => {
      expect(generateCroppedImageMock).toHaveBeenCalled()
      expect(result.current.croppedPreview).toBe('data:image/jpeg;base64,cropped')
    })

    expect(result.current.croppedBlob).toBeInstanceOf(Blob)
    const [, , sizeArg] = generateCroppedImageMock.mock.calls[0]
    expect(sizeArg).toBe(CROPPED_IMAGE_SIZE)
  })
})
