"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

const interacSchema = z.object({
  senderName: z.string().min(1, "Your name is required").max(120),
  senderEmail: z.string().email("Provide a valid email address"),
  amount: z
    .coerce.number({ invalid_type_error: "Enter the transfer amount" })
    .positive("Amount must be greater than zero"),
  reference: z.string().max(140).optional(),
  message: z.string().max(500).optional(),
  securityQuestion: z.string().max(160).optional(),
  securityAnswer: z.string().max(160).optional(),
  autoDeposit: z.boolean().default(false),
});

type InteracFormValues = z.infer<typeof interacSchema>;

type InteracPaymentFormProps = {
  userId?: string | null;
  defaultEmail?: string | null;
};

const recipientEmail =
  process.env.NEXT_PUBLIC_INTERAC_RECIPIENT_EMAIL ?? "payments@example.com";
const recipientName =
  process.env.NEXT_PUBLIC_INTERAC_RECIPIENT_NAME ?? "Onyx Finance";

export function InteracPaymentForm({
  userId,
  defaultEmail,
}: InteracPaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<InteracFormValues>({
    resolver: zodResolver(interacSchema),
    defaultValues: {
      senderName: "",
      senderEmail: defaultEmail ?? "",
      amount: 0,
      reference: "",
      message: "",
      securityQuestion: "",
      securityAnswer: "",
      autoDeposit: false,
    },
  });

  const handleSubmit = async (values: InteracFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/interac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: values.senderName,
          senderEmail: values.senderEmail,
          amount: values.amount,
          currency: "CAD",
          reference: values.reference || undefined,
          message: values.message || undefined,
          securityQuestion: values.securityQuestion || undefined,
          securityAnswer: values.securityAnswer || undefined,
          autoDeposit: values.autoDeposit,
          userId,
          metadata: {
            browserLocale: typeof window !== "undefined" ? navigator.language : "",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message ?? "Unable to save Interac details.");
      }

      toast({
        title: "Interac payment logged",
        description:
          "We saved your transfer details. Send your e-Transfer to the email below and we will reconcile within 1 business day.",
      });

      form.reset({
        senderName: "",
        senderEmail: defaultEmail ?? "",
        amount: 0,
        reference: "",
        message: "",
        securityQuestion: "",
        securityAnswer: "",
        autoDeposit: values.autoDeposit,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast({
        title: "Interac payment failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Send your Interac e-Transfer to
        <span className="mx-1 font-semibold text-foreground">
          {recipientName}
        </span>
        at
        <span className="mx-1 font-semibold text-foreground">
          {recipientEmail}
        </span>
        . Include your name or booking reference in the message to help us
        reconcile the payment quickly.
      </div>

      <Form {...form}>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="senderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender name</FormLabel>
                <FormControl>
                  <Input placeholder="Satoshi Nakamoto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="senderEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="satoshi@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (CAD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="1200.00"
                    {...field}
                    onChange={(event) =>
                      field.onChange(parseFloat(event.target.value))
                    }
                  />
                </FormControl>
                <FormDescription>
                  Enter the total you will send via Interac e-Transfer.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Lease 1234" {...field} />
                </FormControl>
                <FormDescription>
                  Add a note or booking reference that will appear with your
                  transfer.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message to our team (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional context for our finance team."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="securityQuestion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Security question (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="What is the passphrase?" {...field} />
                </FormControl>
                <FormDescription>
                  Only required if you are not using Interac auto-deposit.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="securityAnswer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Security answer (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter the answer"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  We store a hashed version so our team can accept your
                  transfer securely.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoDeposit"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Interac auto-deposit enabled</FormLabel>
                  <FormDescription>
                    Check this if your bank confirms deposits automatically. If
                    unchecked we will wait for the security answer before
                    accepting the transfer.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Interac payment
          </Button>
        </form>
      </Form>
    </div>
  );
}
