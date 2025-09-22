"use client"

import Link from "next/link"
import {
  type ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import useSupabaseBrowser from "@/utils/supabase-browser"

interface ReceiptUploaderProps {
  paymentId: string
  initialReceiptPath: string | null
  canManageReceipt: boolean
}

export function ReceiptUploader({
  paymentId,
  initialReceiptPath,
  canManageReceipt,
}: ReceiptUploaderProps) {
  const supabase = useSupabaseBrowser()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [receiptPath, setReceiptPath] = useState<string | null>(initialReceiptPath)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setReceiptPath(initialReceiptPath)
  }, [initialReceiptPath])

  const loadSignedUrl = useCallback(
    async (path: string | null) => {
      if (!path || !canManageReceipt) {
        setSignedUrl(null)
        return
      }

      const { data, error: signedError } = await supabase
        .storage
        .from("receipts")
        .createSignedUrl(path, 60 * 60)

      if (signedError) {
        setError(signedError.message)
        setSignedUrl(null)
        return
      }

      setSignedUrl(data?.signedUrl ?? null)
    },
    [canManageReceipt, supabase],
  )

  useEffect(() => {
    setError(null)
    void loadSignedUrl(receiptPath)
  }, [loadSignedUrl, receiptPath])

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!canManageReceipt) {
      resetFileInput()
      return
    }

    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setError(null)
    setSuccess(null)
    setUploading(true)

    try {
      const extension = file.name.split(".").pop()
      const sanitizedExtension = extension ? `.${extension}` : ""
      const newPath = `${paymentId}/${Date.now()}-${Math.random().toString(36).slice(2)}${sanitizedExtension}`

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(newPath, file, {
          cacheControl: "3600",
          metadata: { payment_id: paymentId },
        })

      if (uploadError) {
        throw uploadError
      }

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          receipt_path: newPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .select("receipt_path")
        .single()

      if (updateError) {
        throw updateError
      }

      setReceiptPath(newPath)
      setSuccess("Receipt uploaded successfully.")
      await loadSignedUrl(newPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upload receipt."
      setError(message)
    } finally {
      resetFileInput()
      setUploading(false)
    }
  }

  const handleSelectClick = () => {
    if (!canManageReceipt) return

    fileInputRef.current?.click()
  }

  const showUploadCta = canManageReceipt
  const hasReceipt = Boolean(receiptPath)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Receipt archive</CardTitle>
          <CardDescription>
            Upload confirmations for off-platform payments so everyone has a consistent record.
          </CardDescription>
        </div>
        <Badge variant={hasReceipt ? "secondary" : "outline"}>
          {hasReceipt ? "Receipt on file" : "No receipt uploaded"}
        </Badge>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          id="payment-receipt"
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={!canManageReceipt}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-2">
            <Label htmlFor="payment-receipt">Receipt file</Label>
            <Input
              type="text"
              readOnly
              value={receiptPath ?? "No receipt uploaded yet"}
              className="font-mono"
              aria-readonly
            />
          </div>
          {showUploadCta && (
            <Button onClick={handleSelectClick} isLoading={uploading} disabled={uploading}>
              {hasReceipt ? "Replace receipt" : "Upload receipt"}
            </Button>
          )}
        </div>
        {!canManageReceipt && (
          <p className="text-sm text-muted-foreground">
            Only the payer and administrators can manage receipt uploads for this payment.
          </p>
        )}
        {signedUrl && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={signedUrl} target="_blank" rel="noopener noreferrer">
                View uploaded receipt
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Signed link expires in one hour. Generate a new upload to refresh access.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
      </CardContent>
    </Card>
  )
}
