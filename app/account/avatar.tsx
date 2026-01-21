"use client"

import { ChangeEvent, useEffect, useId, useRef, useState } from "react"
import { UploadCloud } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

interface ProfileAvatarProps {
  uid: string
  url: string | null
  size: number
  onUpload: (url: string) => void
  name?: string | null
}

export default function ProfileAvatar({
  uid,
  url,
  size,
  onUpload,
  name,
}: ProfileAvatarProps) {
  const supabase = useSupabaseBrowser()
  const inputId = useId()
  const helperId = `${inputId}-helper`
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let isMounted = true
    let objectUrl: string | undefined

    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from("avatars").download(path)
        if (error) {
          throw error
        }

        objectUrl = URL.createObjectURL(data)
        if (isMounted) {
          setAvatarUrl(objectUrl)
        }
      } catch (error) {
        console.error("Error downloading profile image", error)
        toast({
          variant: "destructive",
          title: "Could not load your profile photo",
          description: "Try refreshing the page or uploading a new image.",
        })
      }
    }

    if (url) {
      downloadImage(url)
    } else {
      setAvatarUrl(null)
    }

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [supabase, url])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    const maxSizeBytes = 2 * 1024 * 1024

    if (file.size > maxSizeBytes) {
      toast({
        variant: "destructive",
        title: "Image too large",
        description: "Please upload an image smaller than 2 MB.",
      })
      event.target.value = ""
      return
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase()
    const sanitizedExt = fileExt && fileExt.length <= 5 ? fileExt : "png"
    const fileName = `${uid}/${crypto.randomUUID()}.${sanitizedExt}`

    setUploading(true)
    try {
      const { error } = await supabase.storage.from("avatars").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        throw error
      }

      onUpload(fileName)
    } catch (error) {
      console.error("Error uploading avatar", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while uploading your photo.",
      })
    } finally {
      setUploading(false)
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const handleUploadClick = () => {
    inputRef.current?.click()
  }

  const displayName = name?.trim() || "Your profile"
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)
  const fallbackInitials = initials || "SH"

  return (
    <div className="flex flex-col items-center gap-4 lg:w-72 lg:items-start">
      <Avatar
        className="border border-border/60 shadow-sm"
        style={{ height: size, width: size }}
      >
        {avatarUrl ? (
          <AvatarImage
            alt={`${displayName}'s avatar`}
            src={avatarUrl}
            className="object-cover"
          />
        ) : (
          <AvatarFallback className="bg-muted text-lg font-semibold uppercase">
            {fallbackInitials}
          </AvatarFallback>
        )}
      </Avatar>

      <input
        ref={inputRef}
        accept="image/*"
        className="hidden"
        id={inputId}
        onChange={handleFileChange}
        type="file"
        disabled={uploading}
      />

      <div className="space-y-3 text-center lg:text-left">
        <div className="space-y-1">
          <Label htmlFor={inputId}>Profile photo</Label>
          <p id={helperId} className="text-sm text-muted-foreground">
            Upload a clear, square PNG or JPG under 2 MB so roommates recognise you instantly.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            isLoading={uploading}
            aria-describedby={helperId}
          >
            <UploadCloud aria-hidden="true" className="mr-2 size-4" />
            {uploading ? "Uploading..." : "Upload photo"}
          </Button>
          <span className="text-xs text-muted-foreground">Recommended: 400×400px</span>
        </div>
      </div>
    </div>
  )
}
