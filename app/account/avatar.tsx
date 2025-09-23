'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Cropper from 'react-easy-crop'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { CROPPED_IMAGE_SIZE } from '@/utils/crop-image'
import { useAvatarCropper } from '@/hooks/use-avatar-cropper'
import useSupabaseBrowser from '@/utils/supabase-browser'

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null
  url: string | null
  size: number
  onUpload: (url: string) => void
}) {
  const supabase = useSupabaseBrowser()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
  const [uploading, setUploading] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const {
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
  } = useAvatarCropper({
    onError: (error) => {
      console.error('Error preparing avatar preview', error)
    },
  })

  useEffect(() => {
    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from('avatars').download(path)
        if (error) {
          throw error
        }

        const downloadUrl = URL.createObjectURL(data)
        setAvatarUrl(downloadUrl)
        setObjectUrl(downloadUrl)
      } catch (error) {
        console.log('Error downloading image: ', error)
      }
    }

    if (url) {
      downloadImage(url)
    } else {
      setAvatarUrl(null)
      setObjectUrl(null)
    }
  }, [url, supabase])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const handleSave = async () => {
    if (!croppedBlob || !pendingFile || !uid) {
      return
    }

    try {
      setUploading(true)
      const filePath = `${uid}-${Date.now()}.jpeg`
      const { error } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, {
        contentType: 'image/jpeg',
      })

      if (error) {
        throw error
      }

      setAvatarUrl(croppedPreview)
      setObjectUrl(null)
      onUpload(filePath)
      reset()
    } catch (error) {
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className="relative flex shrink-0 overflow-hidden rounded-full"
          style={{ height: size, width: size }}
          unoptimized
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-muted text-sm text-muted-foreground"
          style={{ height: size, width: size }}
        >
          No image
        </div>
      )}
      <div style={{ width: size }}>
        <label
          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="single"
        >
          {uploading ? 'Uploading…' : 'Upload Image'}
        </label>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
            <DialogDescription>Use the controls to create a square version of your photo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              {selectedSource ? (
                <Cropper
                  image={selectedSource}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select an image</div>
              )}
            </div>
            <div className="flex w-full flex-col gap-4 sm:max-w-xs">
              <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                {croppedPreview ? (
                  <Image
                    src={croppedPreview}
                    alt="Avatar preview"
                    width={CROPPED_IMAGE_SIZE}
                    height={CROPPED_IMAGE_SIZE}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Preview</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="avatar-zoom">
                  Zoom
                </label>
                <Slider
                  id="avatar-zoom"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0] ?? 1)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={reset} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!croppedBlob || uploading || !uid}>
              {uploading ? 'Saving…' : 'Save & Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}