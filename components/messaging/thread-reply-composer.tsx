"use client"

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, useId, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Loader2, Paperclip, UploadCloud, X } from "lucide-react"

const MAX_ATTACHMENTS = 5

type AttachmentEntry = {
  id: string
  file: File
}

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const precision = size >= 10 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(precision)} ${units[unitIndex]}`
}

export function ThreadReplyComposer() {
  const { toast } = useToast()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return
    }

    setAttachments((current) => {
      const existingKeys = new Set(current.map((entry) => `${entry.file.name}-${entry.file.size}`))
      const next: AttachmentEntry[] = [...current]

      Array.from(fileList).some((file) => {
        const key = `${file.name}-${file.size}`

        if (existingKeys.has(key) || next.length >= MAX_ATTACHMENTS) {
          return next.length >= MAX_ATTACHMENTS
        }

        next.push({ id: crypto.randomUUID(), file })
        existingKeys.add(key)
        return false
      })

      return next
    })
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget === event.target) {
      setIsDragActive(false)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((current) => current.filter((entry) => entry.id !== id))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openFileDialog()
    }
  }

  const canSubmit = message.trim().length > 0 || attachments.length > 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 600))

      toast({
        title: "Update ready to post",
        description:
          attachments.length > 0
            ? `Your message and ${attachments.length} attachment${attachments.length === 1 ? "" : "s"} are queued for roommates.`
            : "Your message is queued for roommates.",
      })

      setMessage("")
      setAttachments([])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Post an update</h3>
        <p className="text-xs text-muted-foreground">
          Share context, link to documents, or upload supporting files so the whole house stays aligned.
        </p>
      </div>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Add an update for your roommates..."
        className="min-h-[120px] resize-none"
      />

      <div className="space-y-2">
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload attachments"
          onClick={openFileDialog}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center transition",
            "hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            isDragActive && "border-primary/60 bg-primary/10",
          )}
        >
          <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PDFs, images, and spreadsheets. Max {MAX_ATTACHMENTS} files.</p>
          </div>
        </div>
        {attachments.length > 0 ? (
          <ul className="space-y-2">
            {attachments.map((attachment) => {
              const extension = attachment.file.name.split(".").pop()?.toUpperCase()
              return (
                <li
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-background/90 px-3 py-2"
                >
                  <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                  <div className="flex-1 space-y-0.5">
                    <p className="break-all text-sm font-medium text-foreground">{attachment.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file.size)}
                      {attachment.file.type ? ` • ${attachment.file.type}` : null}
                    </p>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    {extension ?? "FILE"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                    <span className="sr-only">Remove attachment</span>
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Attachments will be scanned before posting to keep the community safe.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {attachments.length > 0
            ? `${attachments.length} file${attachments.length === 1 ? "" : "s"} selected`
            : "No files selected"}
        </span>
        <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Posting...
            </>
          ) : (
            "Post update"
          )}
        </Button>
      </div>
    </form>
  )
}
