"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

const composerSchema = z.object({
  threadId: z.string().min(1, "Thread is required"),
  content: z.string().min(3, "Message must be at least 3 characters"),
});

type ComposerFormData = z.infer<typeof composerSchema>;

export function MessageComposer() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const {
    submit,
    isOnline,
    queuedCount,
    statusLabel,
    lastSyncedAt,
  } = useOfflineQueue("messaging", "/api/messaging");

  const form = useForm<ComposerFormData>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      threadId: "house-feed",
      content: "",
    },
  });

  const onSubmit = async (values: ComposerFormData) => {
    setIsSubmitting(true);

    try {
      const { response, queued } = await submit(values);

      if (queued) {
        toast({
          title: "Message queued offline",
          description: "We'll post this update as soon as you're reconnected.",
        });
        form.reset({ ...values, content: "" });
        return;
      }

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: unknown }
        | null;

      if (!response.ok || !result?.success) {
        const errorMessage =
          typeof result?.error === "string"
            ? result.error
            : "Failed to post message";
        throw new Error(errorMessage);
      }

      toast({
        title: "Message posted",
        description: "Your roommates will see this in the thread.",
      });

      form.reset({ threadId: values.threadId, content: "" });
    } catch (error) {
      console.error("Failed to submit message", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to post message",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isOnline && (
          <div className="rounded-md border border-dashed border-amber-500/60 bg-amber-50 p-3 text-sm text-amber-900">
            You're offline. We'll queue this message and deliver it once you're back online.
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{statusLabel}</p>
            <p className="text-muted-foreground">
              {queuedCount > 0
                ? `Queued messages: ${queuedCount}`
                : lastSyncedAt
                ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`
                : "Ready to send"}
            </p>
          </div>
          <Badge variant={queuedCount > 0 ? "secondary" : "outline"}>
            {queuedCount > 0 ? `${queuedCount} queued` : "Up to date"}
          </Badge>
        </div>

        <FormField
          control={form.control}
          name="threadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thread</FormLabel>
              <FormControl>
                <Input placeholder="e.g., chore-rotation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share an update with your roommates..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          {queuedCount > 0 ? (
            <Badge variant="secondary">{queuedCount} queued</Badge>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post message"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
