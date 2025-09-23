"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { ConflictDialog, ConflictField, ConflictResolutionPayload } from "@/components/conflicts/ConflictDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentStatus, DocumentWithLease } from "@/types/documents";
import { cn } from "@/lib/utils";
import { updateDocumentAction } from "@/app/documents/actions";
import type { DocumentConflictPayload } from "@/app/documents/actions";
import { toast } from "sonner";

const documentStatuses: { label: string; value: DocumentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Pending signature", value: "pending_signature" },
  { label: "Signed", value: "signed" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
];

type DocumentFormState = {
  title: string;
  description: string;
  status: DocumentStatus;
  requiresSignature: boolean;
  expiresAt: string;
};

type PendingConflictState = {
  conflict: DocumentConflictPayload;
  attemptedValues: DocumentFormState;
  baseVersion: number | null;
};

export interface EditDocumentDialogProps {
  document: DocumentWithLease;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDocumentDialog({ document, open, onOpenChange }: EditDocumentDialogProps) {
  const [formState, setFormState] = useState<DocumentFormState>(() => initializeFormState(document));
  const [optimisticVersion, setOptimisticVersion] = useState<number | null>(document.version ?? null);
  const [optimisticUpdatedAt, setOptimisticUpdatedAt] = useState<string | null>(document.updated_at ?? null);
  const [pendingConflict, setPendingConflict] = useState<PendingConflictState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setFormState(initializeFormState(document));
      setOptimisticVersion(document.version ?? null);
      setOptimisticUpdatedAt(document.updated_at ?? null);
      setPendingConflict(null);
    }
  }, [document, open]);

  const conflictFields: ConflictField[] = useMemo(() => {
    if (!pendingConflict) {
      return [];
    }

    const { conflict, attemptedValues } = pendingConflict;
    const current = conflict.current;

    return [
      {
        key: "title",
        label: "Title",
        mine: attemptedValues.title,
        theirs: current.title ?? "",
      },
      {
        key: "description",
        label: "Description",
        mine: attemptedValues.description,
        theirs: current.description ?? "",
        variant: "multiline",
      },
      {
        key: "status",
        label: "Status",
        mine: attemptedValues.status,
        theirs: current.status ?? "",
      },
      {
        key: "requires_signature",
        label: "Requires signature",
        mine: attemptedValues.requiresSignature ? "true" : "false",
        theirs: (current.requires_signature ?? false) ? "true" : "false",
        helperText: "Enter true or false when merging manually.",
      },
      {
        key: "expires_at",
        label: "Expiration date",
        mine: attemptedValues.expiresAt,
        theirs: normalizeDateInput(current.expires_at),
        helperText: "Use YYYY-MM-DD format when merging manually.",
      },
    ];
  }, [pendingConflict]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const updates = buildUpdatePayload(formState);

    startTransition(async () => {
      const result = await updateDocumentAction({
        documentId: document.id,
        updates,
        expectedVersion: optimisticVersion,
        expectedUpdatedAt: optimisticUpdatedAt ?? undefined,
      });

      if (result.status === "conflict" && result.conflict) {
        setPendingConflict({
          conflict: result.conflict,
          attemptedValues: formState,
          baseVersion: optimisticVersion,
        });
        toast.error("We found a newer version. Review the differences before saving.");
        return;
      }

      if (!result.success) {
        toast.error(result.error ?? "Failed to update document");
        return;
      }

      toast.success("Document updated successfully");
      setOptimisticVersion(result.data?.version ?? null);
      setOptimisticUpdatedAt(result.data?.updated_at ?? null);
      if (result.data) {
        setFormState(initializeFormState(result.data));
      }
      onOpenChange(false);
    });
  };

  const handleConflictResolution = async ({ type, values, baseVersion }: ConflictResolutionPayload) => {
    if (!pendingConflict) return;

    const mergedFormState = applyResolvedValues(formState, values);
    const updates = buildUpdatePayload(mergedFormState);

    const result = await updateDocumentAction({
      documentId: document.id,
      updates,
      expectedVersion: pendingConflict.conflict.latestVersion ?? undefined,
      expectedUpdatedAt: pendingConflict.conflict.latestUpdatedAt ?? undefined,
      resolution: {
        type,
        mergedFields: updates,
        baseVersion: baseVersion ?? pendingConflict.baseVersion ?? optimisticVersion ?? null,
      },
    });

    if (result.status === "conflict" && result.conflict) {
      // Newer conflict emerged; update dialog with freshest values
      setPendingConflict({
        conflict: result.conflict,
        attemptedValues: mergedFormState,
        baseVersion: optimisticVersion,
      });
      toast.error("Another update happened before your merge. Review the latest version.");
      return;
    }

    if (!result.success) {
      toast.error(result.error ?? "Failed to apply conflict resolution");
      return;
    }

    toast.success("Document changes saved");
    setOptimisticVersion(result.data?.version ?? null);
    setOptimisticUpdatedAt(result.data?.updated_at ?? null);
    if (result.data) {
      setFormState(initializeFormState(result.data));
    }
    setPendingConflict(null);
    onOpenChange(false);
  };

  const conflictMessage = pendingConflict?.conflict.message;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>
              Update the metadata and signing requirements for this document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="document-title">Title</Label>
              <Input
                id="document-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value: DocumentStatus) =>
                    setFormState((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-expires">Expiration date</Label>
                <Input
                  id="document-expires"
                  type="date"
                  value={formState.expiresAt}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="document-requires-signature" className="text-base">
                  Requires signature
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, the document will remain pending until all signatures are captured.
                </p>
              </div>
              <Switch
                id="document-requires-signature"
                checked={formState.requiresSignature}
                onCheckedChange={(checked) =>
                  setFormState((current) => ({ ...current, requiresSignature: checked }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} className={cn(isPending && "cursor-progress")}> 
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConflictDialog
        open={pendingConflict != null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingConflict(null);
          }
        }}
        entityName="Document"
        message={conflictMessage}
        fields={conflictFields}
        isResolving={isPending}
        baseVersion={pendingConflict?.baseVersion ?? optimisticVersion ?? null}
        onResolve={handleConflictResolution}
        onCancel={() => setPendingConflict(null)}
      />
    </>
  );
}

function initializeFormState(document: DocumentWithLease): DocumentFormState {
  return {
    title: document.title,
    description: document.description ?? "",
    status: document.status,
    requiresSignature: document.requires_signature,
    expiresAt: normalizeDateInput(document.expires_at),
  };
}

function normalizeDateInput(value?: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    return "";
  }
}

function buildUpdatePayload(formState: DocumentFormState) {
  return {
    title: formState.title.trim(),
    description: formState.description,
    status: formState.status,
    requires_signature: formState.requiresSignature,
    expires_at: formState.expiresAt ? new Date(formState.expiresAt).toISOString() : null,
  } as const;
}

function applyResolvedValues(
  current: DocumentFormState,
  values: Record<string, string>
): DocumentFormState {
  return {
    title: values.title ?? current.title,
    description: values.description ?? current.description,
    status: (values.status as DocumentStatus) ?? current.status,
    requiresSignature: parseBoolean(values.requires_signature, current.requiresSignature),
    expiresAt: values.expires_at ?? current.expiresAt,
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}
