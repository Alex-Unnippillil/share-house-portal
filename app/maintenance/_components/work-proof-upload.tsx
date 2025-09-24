"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import type { MaintenancePhotoAttachment } from "@/lib/maintenance/types";
import { createClient } from "@/utils/supabase-browser";

const MAINTENANCE_PHOTO_BUCKET = "maintenance-photos";

interface WorkProofUploadProps {
  requestId: string;
  unitId: string;
  onUploaded?: (attachments: MaintenancePhotoAttachment[]) => void;
}

type UploadStatus = "queued" | "uploading" | "complete" | "error";

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: UploadStatus;
  error?: string;
};

export function WorkProofUpload({ requestId, unitId, onUploaded }: WorkProofUploadProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileSelection = async (filesList: FileList | null) => {
    if (!filesList) return;

    for (const file of Array.from(filesList)) {
      const uploadId = crypto.randomUUID();
      setUploads((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 12, status: "uploading" },
      ]);

      try {
        const timestamp = Date.now();
        const sanitized = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
        const storagePath = `${unitId}/${requestId}/progress/${timestamp}-${uploadId}-${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from(MAINTENANCE_PHOTO_BUCKET)
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(MAINTENANCE_PHOTO_BUCKET)
          .getPublicUrl(storagePath);

        const attachment: MaintenancePhotoAttachment = {
          bucket: MAINTENANCE_PHOTO_BUCKET,
          path: storagePath,
          name: file.name,
          size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
          public_url: publicUrlData.publicUrl ?? null,
        };

        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? { ...upload, progress: 100, status: "complete" }
              : upload,
          ),
        );

        onUploaded?.([attachment]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected error while uploading file.";
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId
              ? { ...upload, progress: 100, status: "error", error: message }
              : upload,
          ),
        );
        toast({
          title: `Failed to upload ${file.name}`,
          description: message,
          variant: "destructive",
        });
      }
    }
  };

  const clearUploads = () => setUploads([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            void handleFileSelection(event.target.files);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={clearUploads}>
          Clear list
        </Button>
      </div>
      <div className="space-y-3">
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Upload completion photos or invoices to attach them to this maintenance ticket.
          </p>
        ) : (
          uploads.map((upload) => (
            <div key={upload.id} className="space-y-1 rounded-md border border-dashed p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="truncate">{upload.name}</span>
                <span
                  className={
                    upload.status === "complete"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : upload.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {upload.status === "complete"
                    ? "Uploaded"
                    : upload.status === "error"
                    ? "Failed"
                    : "Uploading"}
                </span>
              </div>
              <Progress value={upload.progress} className="h-2" />
              {upload.error ? (
                <p className="text-xs text-destructive">{upload.error}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
