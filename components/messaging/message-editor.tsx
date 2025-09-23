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
import { Textarea } from "@/components/ui/textarea";
import { updateMessageAction } from "@/app/messaging/actions";
import type { Message, MessageConflictPayload } from "@/app/messaging/actions";
import { toast } from "sonner";

type MessageEditorProps = {
  message: Message;
};

type ConflictState = {
  conflict: MessageConflictPayload;
  attemptedContent: string;
  baseVersion: number | null;
};

export function MessageEditor({ message }: MessageEditorProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(message.content);
  const [currentMessage, setCurrentMessage] = useState(message);
  const [optimisticVersion, setOptimisticVersion] = useState<number | null>(message.version ?? null);
  const [optimisticUpdatedAt, setOptimisticUpdatedAt] = useState<string | null>(message.updated_at ?? null);
  const [pendingConflict, setPendingConflict] = useState<ConflictState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setContent(currentMessage.content);
      setPendingConflict(null);
    }
  }, [open, currentMessage]);

  const conflictFields: ConflictField[] = useMemo(() => {
    if (!pendingConflict) return [];
    return [
      {
        key: "content",
        label: "Message",
        mine: pendingConflict.attemptedContent,
        theirs: pendingConflict.conflict.current.content,
        variant: "multiline",
      },
    ];
  }, [pendingConflict]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateMessageAction({
        messageId: currentMessage.id,
        updates: { content },
        expectedVersion: optimisticVersion,
        expectedUpdatedAt: optimisticUpdatedAt ?? undefined,
      });

      if (result.status === "conflict" && result.conflict) {
        setPendingConflict({
          conflict: result.conflict,
          attemptedContent: content,
          baseVersion: optimisticVersion,
        });
        toast.error("Someone else edited this message. Resolve the differences to continue.");
        return;
      }

      if (!result.success) {
        toast.error(result.error ?? "Failed to update message");
        return;
      }

      toast.success("Message updated");
      if (result.data) {
        setCurrentMessage(result.data);
        setContent(result.data.content);
        setOptimisticVersion(result.data.version ?? null);
        setOptimisticUpdatedAt(result.data.updated_at ?? null);
      }
      setOpen(false);
    });
  };

  const handleConflictResolution = async ({ type, values, baseVersion }: ConflictResolutionPayload) => {
    if (!pendingConflict) return;
    const resolvedContent = values.content ?? content;

    const result = await updateMessageAction({
      messageId: currentMessage.id,
      updates: { content: resolvedContent },
      expectedVersion: pendingConflict.conflict.latestVersion ?? undefined,
      expectedUpdatedAt: pendingConflict.conflict.latestUpdatedAt ?? undefined,
      resolution: {
        type,
        mergedFields: { content: resolvedContent },
        baseVersion: baseVersion ?? pendingConflict.baseVersion ?? optimisticVersion ?? null,
      },
    });

    if (result.status === "conflict" && result.conflict) {
      setPendingConflict({
        conflict: result.conflict,
        attemptedContent: resolvedContent,
        baseVersion: optimisticVersion,
      });
      toast.error("The message changed again. Review the newest version before saving.");
      return;
    }

    if (!result.success) {
      toast.error(result.error ?? "Failed to resolve conflict");
      return;
    }

    toast.success("Message updated");
    if (result.data) {
      setCurrentMessage(result.data);
      setContent(result.data.content);
      setOptimisticVersion(result.data.version ?? null);
      setOptimisticUpdatedAt(result.data.updated_at ?? null);
    }
    setPendingConflict(null);
    setOpen(false);
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Pinned update</p>
            <p className="text-xs text-muted-foreground">
              Last edited {new Date(currentMessage.updated_at ?? currentMessage.created_at).toLocaleString()}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Edit message
          </Button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{currentMessage.content}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
            <DialogDescription>
              Update the announcement and resolve any conflicts before publishing your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Share an update with your household"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictDialog
        open={pendingConflict != null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingConflict(null);
          }
        }}
        entityName="message"
        fields={conflictFields}
        isResolving={isPending}
        baseVersion={pendingConflict?.baseVersion ?? optimisticVersion ?? null}
        onResolve={handleConflictResolution}
        onCancel={() => setPendingConflict(null)}
        message={pendingConflict?.conflict.message}
      />
    </>
  );
}
