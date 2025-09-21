"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase";
import { createLeaseEnvelopeAction } from "../actions";

const initialState = { success: false, error: undefined as string | undefined };

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type Props = {
  document: DocumentRow;
  tenants: Array<Pick<ProfileRow, "id" | "full_name" | "email" | "role" | "username">>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} isLoading={pending}>
      {pending ? "Sending" : "Send for signature"}
    </Button>
  );
}

export function StartEnvelopeForm({ document, tenants }: Props) {
  const [state, formAction] = useFormState(createLeaseEnvelopeAction, initialState);

  const eligibleTenants = useMemo(() => tenants ?? [], [tenants]);
  const [selectedTenantId, setSelectedTenantId] = useState(
    eligibleTenants[0]?.id ?? "",
  );
  const [signerName, setSignerName] = useState(
    eligibleTenants[0]?.full_name ?? eligibleTenants[0]?.username ?? "",
  );
  const [signerEmail, setSignerEmail] = useState(
    eligibleTenants[0]?.email ?? "",
  );
  const signerRole = "tenant";

  const handleTenantChange = (value: string) => {
    setSelectedTenantId(value);
    const tenant = eligibleTenants.find((item) => item.id === value);
    if (tenant) {
      setSignerName(tenant.full_name ?? tenant.username ?? "");
      setSignerEmail(tenant.email ?? "");
    }
  };

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="documentId" value={document.id} />
      <input
        type="hidden"
        name="templateId"
        value={document.documenso_template_id}
      />
      <input type="hidden" name="signerRole" value={signerRole} />

      <div className="space-y-1">
        <Label htmlFor={`tenant-${document.id}`}>Tenant</Label>
        <select
          id={`tenant-${document.id}`}
          name="tenantProfileId"
          value={selectedTenantId}
          onChange={(event) => handleTenantChange(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="" disabled>
            Select a tenant
          </option>
          {eligibleTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.full_name ?? tenant.username ?? tenant.email}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`signer-name-${document.id}`}>Signer name</Label>
          <Input
            id={`signer-name-${document.id}`}
            name="signerName"
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            placeholder="Lessee full name"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`signer-email-${document.id}`}>Signer email</Label>
          <Input
            id={`signer-email-${document.id}`}
            name="signerEmail"
            type="email"
            value={signerEmail}
            onChange={(event) => setSignerEmail(event.target.value)}
            placeholder="lessee@example.com"
            required
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">
          Envelope created and sent for signature.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
