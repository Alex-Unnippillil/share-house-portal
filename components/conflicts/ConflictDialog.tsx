"use client";

import { useEffect, useMemo, useState } from "react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ConflictField = {
  key: string;
  label: string;
  mine: string;
  theirs: string;
  variant?: "single" | "multiline";
  helperText?: string;
};

export type ConflictResolutionMode = "keep_mine" | "keep_theirs" | "manual";

export type ConflictResolutionPayload = {
  type: ConflictResolutionMode;
  values: Record<string, string>;
  baseVersion?: number | null;
};

export interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  message?: string;
  fields: ConflictField[];
  isResolving?: boolean;
  baseVersion?: number | null;
  onResolve: (payload: ConflictResolutionPayload) => void | Promise<void>;
  onCancel?: () => void;
}

export function ConflictDialog({
  open,
  onOpenChange,
  entityName,
  message,
  fields,
  isResolving = false,
  baseVersion,
  onResolve,
  onCancel,
}: ConflictDialogProps) {
  const [mode, setMode] = useState<ConflictResolutionMode>("keep_mine");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const initialManual: Record<string, string> = {};
      for (const field of fields) {
        initialManual[field.key] = field.mine;
      }
      setManualValues(initialManual);
      setMode("keep_mine");
    }
  }, [open, fields]);

  const changedFields = useMemo(() => {
    return fields.filter((field) => field.mine !== field.theirs).map((field) => field.key);
  }, [fields]);

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && onCancel) {
      onCancel();
    }
  };

  const resolveValues = (): Record<string, string> => {
    if (mode === "keep_theirs") {
      return fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = field.theirs;
        return acc;
      }, {});
    }

    if (mode === "manual") {
      return { ...manualValues };
    }

    return fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = field.mine;
      return acc;
    }, {});
  };

  const handleConfirm = async () => {
    const payload: ConflictResolutionPayload = {
      type: mode,
      values: resolveValues(),
      baseVersion,
    };

    await onResolve(payload);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resolve {entityName} conflict</DialogTitle>
          <DialogDescription>
            {message ??
              `Someone else updated this ${entityName.toLowerCase()} before your changes were saved. Review the differences below and choose how to continue.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Resolution</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === "keep_mine" ? "default" : "outline"}
                onClick={() => setMode("keep_mine")}
              >
                Keep my edits
              </Button>
              <Button
                type="button"
                variant={mode === "keep_theirs" ? "default" : "outline"}
                onClick={() => setMode("keep_theirs")}
              >
                Use latest version
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "outline"}
                onClick={() => setMode("manual")}
              >
                Manual merge
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[320px] rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">My version</th>
                  <th className="px-4 py-3 font-medium">Latest version</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  const isChanged = changedFields.includes(field.key);
                  return (
                    <tr
                      key={field.key}
                      className={cn(isChanged && "bg-destructive/5")}
                    >
                      <td className="align-top px-4 py-3 font-medium text-foreground">
                        <div className="space-y-1">
                          <div>{field.label}</div>
                          {field.helperText ? (
                            <p className="text-xs text-muted-foreground">{field.helperText}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="w-1/3 px-4 py-3 align-top">
                        <ValuePreview value={field.mine} multiline={field.variant === "multiline"} />
                      </td>
                      <td className="w-1/3 px-4 py-3 align-top">
                        <ValuePreview value={field.theirs} multiline={field.variant === "multiline"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>

          {mode === "manual" ? (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`manual-${field.key}`}>{field.label}</Label>
                  {field.variant === "multiline" ? (
                    <Textarea
                      id={`manual-${field.key}`}
                      value={manualValues[field.key] ?? ""}
                      onChange={(event) =>
                        setManualValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={`manual-${field.key}`}
                      value={manualValues[field.key] ?? ""}
                      onChange={(event) =>
                        setManualValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {changedFields.length > 0
              ? `${changedFields.length} field${changedFields.length === 1 ? "" : "s"} differ between versions.`
              : "No differences detected between the two versions."}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isResolving}>
              {mode === "manual" ? "Confirm merge" : "Apply selection"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ValuePreviewProps {
  value: string;
  multiline?: boolean;
}

function ValuePreview({ value, multiline = false }: ValuePreviewProps) {
  if (!value) {
    return <span className="text-muted-foreground">Empty</span>;
  }

  if (multiline) {
    return (
      <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
        {value}
      </pre>
    );
  }

  return <span className="text-sm text-foreground">{value}</span>;
}
