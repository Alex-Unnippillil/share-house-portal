"use client"

import { type ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Area } from "react-easy-crop"

import AvatarEditor, { type AvatarEditorResult } from "@/components/profile/AvatarEditor"
import { Button } from "@/components/ui/button"
import useSupabaseBrowser from "@/utils/supabase-browser"

import {
  AVATAR_VARIANTS,
  type AvatarVariantKey,
  type AvatarVariantBlobs,
  buildVariantPathSet,
  uploadAvatarVariants,
} from "./avatar-helpers"

interface AvatarProps {
  uid: string | null
  url: string | null
  size: number
  onUpload: (url: string) => Promise<void> | void
}

type PreviewSources = Partial<Record<AvatarVariantKey, string>>

const PLACEHOLDER_TEXT = "Upload avatar"

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Unable to read image"))
        return
      }
      resolve(result)
    })
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Unable to read image"))
    })
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (event) => reject(event instanceof Error ? event : new Error("Failed to load image")))
    image.crossOrigin = "anonymous"
    image.src = src
  })
}

async function createAvatarBlobs(imageSrc: string, cropArea: Area) {
  const image = await loadImage(imageSrc)
  const maxDimension = Math.max(1, Math.min(cropArea.width, cropArea.height))

  const variants = await Promise.all(
    AVATAR_VARIANTS.map(async (definition) => {
      const targetSize = Math.max(1, Math.floor(Math.min(definition.size, maxDimension)))
      const canvas = document.createElement("canvas")
      canvas.width = targetSize
      canvas.height = targetSize
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Unable to access canvas context")
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"

      context.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        targetSize,
        targetSize,
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (!value) {
            reject(new Error("Unable to create avatar image"))
            return
          }
          resolve(value)
        }, "image/jpeg", 0.92)
      })

      return { key: definition.key, blob }
    }),
  )

  return variants
}

function createBlobMap(variants: Awaited<ReturnType<typeof createAvatarBlobs>>): AvatarVariantBlobs {
  const mediumVariant = variants.find((variant) => variant.key === "md")
  if (!mediumVariant) {
    throw new Error("A medium avatar variant is required")
  }

  return variants.reduce<AvatarVariantBlobs>(
    (accumulator, variant) => {
      accumulator[variant.key] = variant.blob
      return accumulator
    },
    { md: mediumVariant.blob },
  )
}

function sourcesFromBlobs(variants: Awaited<ReturnType<typeof createAvatarBlobs>>) {
  const sources: PreviewSources = {}
  const urls: string[] = []

  for (const variant of variants) {
    const objectUrl = URL.createObjectURL(variant.blob)
    sources[variant.key] = objectUrl
    urls.push(objectUrl)
  }

  return { sources, urls }
}

export default function Avatar({ uid, url, size, onUpload }: AvatarProps) {
  const supabase = useSupabaseBrowser()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewUrlRef = useRef<string[]>([])

  const [previewSources, setPreviewSources] = useState<PreviewSources>({})
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const primaryPreview = useMemo(() => previewSources.lg ?? previewSources.md ?? previewSources.sm ?? null, [previewSources])

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const updatePreviewSources = useCallback((nextSources: PreviewSources, urls: string[]) => {
    for (const existing of previewUrlRef.current) {
      URL.revokeObjectURL(existing)
    }
    previewUrlRef.current = urls
    setPreviewSources(nextSources)
  }, [])

  useEffect(() => {
    return () => {
      for (const existing of previewUrlRef.current) {
        URL.revokeObjectURL(existing)
      }
      previewUrlRef.current = []
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function downloadImage(path: string) {
      try {
        const variantPaths = buildVariantPathSet(path)
        const mediumPath = variantPaths.md
        if (!mediumPath) return

        const activeUrls: string[] = []
        const sources: PreviewSources = {}

        const { data: mediumData, error: mediumError } = await supabase.storage.from("avatars").download(mediumPath)
        if (mediumError || !mediumData) {
          throw mediumError ?? new Error("Unable to download avatar")
        }
        const mediumUrl = URL.createObjectURL(mediumData)
        sources.md = mediumUrl
        activeUrls.push(mediumUrl)

        for (const variant of ["sm", "lg"] as AvatarVariantKey[]) {
          const variantPath = variantPaths[variant]
          if (!variantPath) continue
          try {
            const { data, error } = await supabase.storage.from("avatars").download(variantPath)
            if (error || !data) continue
            const objectUrl = URL.createObjectURL(data)
            sources[variant] = objectUrl
            activeUrls.push(objectUrl)
          } catch (error) {
            console.warn("Unable to load avatar variant", error)
          }
        }

        if (!isActive) {
          for (const objectUrl of activeUrls) {
            URL.revokeObjectURL(objectUrl)
          }
          return
        }

        updatePreviewSources(sources, activeUrls)
      } catch (error) {
        console.error("Error downloading image: ", error)
      }
    }

    if (url) {
      downloadImage(url)
    } else {
      updatePreviewSources({}, [])
    }

    return () => {
      isActive = false
    }
  }, [supabase, updatePreviewSources, url])

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      try {
        if (!event.target.files || event.target.files.length === 0) {
          throw new Error("You must select an image to upload.")
        }

        const file = event.target.files[0]
        if (!file.type.startsWith("image/")) {
          throw new Error("Please choose a valid image file.")
        }

        const dataUrl = await readFileAsDataUrl(file)
        setEditorImage(dataUrl)
        setIsEditing(true)
      } catch (error) {
        console.error("Failed to prepare avatar", error)
        alert(error instanceof Error ? error.message : "Unable to open the selected image.")
        resetFileInput()
      }
    },
    [resetFileInput],
  )

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditorImage(null)
    resetFileInput()
  }, [resetFileInput])

  const handleConfirmEdit = useCallback(
    async ({ croppedAreaPixels }: AvatarEditorResult) => {
      if (!uid) {
        alert("We were unable to confirm your account. Please refresh and try again.")
        return
      }
      if (!editorImage) return

      try {
        setUploading(true)
        const variants = await createAvatarBlobs(editorImage, croppedAreaPixels)
        const blobMap = createBlobMap(variants)
        const uploadResult = await uploadAvatarVariants(supabase, uid, blobMap, "jpg")

        const { sources, urls } = sourcesFromBlobs(variants)
        updatePreviewSources(sources, urls)

        await onUpload(uploadResult.defaultPath)
        setIsEditing(false)
        setEditorImage(null)
        resetFileInput()
      } catch (error) {
        console.error("Error uploading avatar", error)
        alert("Error uploading avatar!")
      } finally {
        setUploading(false)
      }
    },
    [editorImage, onUpload, resetFileInput, supabase, uid, updatePreviewSources],
  )

  const handleTriggerFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="relative shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground"
          style={{ height: size, width: size }}
        >
          {primaryPreview ? (
            <picture>
              {previewSources.sm && <source media="(max-width: 480px)" srcSet={previewSources.sm} />}
              {previewSources.md && <source media="(max-width: 1024px)" srcSet={previewSources.md} />}
              <img
                alt="Avatar preview"
                className="block size-full object-cover"
                height={size}
                src={primaryPreview}
                width={size}
              />
            </picture>
          ) : (
            <div className="flex size-full items-center justify-center text-sm font-medium">{PLACEHOLDER_TEXT}</div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Choose a square-friendly photo. You can zoom and reposition before saving.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              accept="image/*"
              className="sr-only"
              id="avatar-upload"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <Button disabled={uploading} onClick={handleTriggerFilePicker} type="button" variant="outline">
              {uploading ? "Uploading..." : "Select image"}
            </Button>
          </div>
        </div>
      </div>

      {isEditing && editorImage ? (
        <AvatarEditor
          aspect={1}
          disabled={uploading}
          imageSrc={editorImage}
          onCancel={handleCancelEdit}
          onConfirm={handleConfirmEdit}
        />
      ) : null}
    </div>
  )
}
