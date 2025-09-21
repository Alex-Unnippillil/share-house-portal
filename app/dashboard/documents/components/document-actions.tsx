"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  refreshDocumentStatusAction,
  sendDocumentForSignatureAction,
} from "../actions";

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type BaseProps = {
  documentId: string;
  disabled?: boolean;
  className?: string;
};

export function SendForSignatureButton({
  documentId,
  disabled,
  className,
}: BaseProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  return (
    <div className="space-y-1">
      <Button
        className={className}
        disabled={disabled || pending}
        onClick={() => {
          startTransition(async () => {
            setFeedback(null);
            const result = await sendDocumentForSignatureAction(documentId);

            if (result.error) {
              setFeedback({ type: "error", message: result.error });
              return;
            }

            setFeedback({
              type: "success",
              message: "Documenso envelope sent successfully.",
            });

            if (result.signingUrl) {
              window.open(result.signingUrl, "_blank", "noopener,noreferrer");
            }
          });
        }}
        variant="default"
      >
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {pending ? "Sending..." : "Send for signature"}
      </Button>
      {feedback ? (
        <p
          className={`text-sm ${feedback.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

type RefreshProps = BaseProps & {
  label?: string;
  openForSigner?: boolean;
};

export function RefreshStatusButton({
  documentId,
  disabled,
  className,
  label = "Refresh status",
  openForSigner,
}: RefreshProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  return (
    <div className="space-y-1">
      <Button
        className={className}
        variant="secondary"
        disabled={disabled || pending}
        onClick={() => {
          startTransition(async () => {
            setFeedback(null);
            const result = await refreshDocumentStatusAction({
              documentId,
              openForSigner: Boolean(openForSigner),
            });

            if (result.error) {
              setFeedback({ type: "error", message: result.error });
              return;
            }

            setFeedback({
              type: "success",
              message: `Status updated${result.status ? ` (${result.status})` : ""}.`,
            });

            if (openForSigner && result.signingUrl) {
              window.open(result.signingUrl, "_blank", "noopener,noreferrer");
            }
          });
        }}
      >
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {pending ? "Refreshing..." : label}
      </Button>
      {feedback ? (
        <p
          className={`text-sm ${feedback.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function ContinueSigningButton({
  documentId,
  disabled,
  className,
}: BaseProps) {
  return (
    <RefreshStatusButton
      className={className}
      documentId={documentId}
      disabled={disabled}
      label="Open signing session"
      openForSigner
    />
  );
}
