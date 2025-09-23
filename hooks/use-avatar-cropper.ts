import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { Area } from 'react-easy-crop'

import { CROPPED_IMAGE_SIZE, generateCroppedImage } from '@/utils/crop-image'

const INITIAL_CROP = { x: 0, y: 0 }

interface UseAvatarCropperOptions {
  onError?: (error: unknown) => void
}

export function useAvatarCropper(options: UseAvatarCropperOptions = {}) {
  const { onError } = options

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [crop, setCrop] = useState(INITIAL_CROP)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function createPreview() {
      if (!selectedSource || !croppedAreaPixels) {
        setCroppedPreview(null)
        setCroppedBlob(null)
        return
      }

      try {
        const { blob, dataUrl } = await generateCroppedImage(
          selectedSource,
          croppedAreaPixels,
          CROPPED_IMAGE_SIZE,
        )

        if (!isCancelled) {
          setCroppedBlob(blob)
          setCroppedPreview(dataUrl)
        }
      } catch (error) {
        if (!isCancelled) {
          setCroppedBlob(null)
          setCroppedPreview(null)
          onError?.(error)
        }
      }
    }

    createPreview()

    return () => {
      isCancelled = true
    }
  }, [croppedAreaPixels, onError, selectedSource])

  const reset = useCallback(() => {
    setIsDialogOpen(false)
    setSelectedSource(null)
    setPendingFile(null)
    setCrop(INITIAL_CROP)
    setZoom(1)
    setCroppedAreaPixels(null)
    setCroppedPreview(null)
    setCroppedBlob(null)
  }, [])

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      setPendingFile(file)
      const reader = new FileReader()

      reader.addEventListener('load', () => {
        const result = typeof reader.result === 'string' ? reader.result : null
        if (result) {
          setSelectedSource(result)
          setIsDialogOpen(true)
        }
      })

      reader.addEventListener('error', (error) => {
        onError?.(error)
      })

      reader.readAsDataURL(file)
      event.target.value = ''
    },
    [onError],
  )

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        reset()
      } else {
        setIsDialogOpen(true)
      }
    },
    [reset],
  )

  return {
    isDialogOpen,
    selectedSource,
    pendingFile,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedPreview,
    croppedBlob,
    handleFileChange,
    handleCropComplete,
    handleDialogChange,
    reset,
  }
}
