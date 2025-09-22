'use client';

import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

import { uploadHouseholdLease } from '../actions';

interface UploadLeaseFormProps {
  availableUnits: string[];
  defaultUnitId?: string;
}

export function UploadLeaseForm({ availableUnits, defaultUnitId }: UploadLeaseFormProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const datalistId = availableUnits.length > 0 ? 'household-unit-options' : undefined;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await uploadHouseholdLease(formData);

      if (!result.success) {
        setError(result.error ?? 'Uploading the lease failed. Please try again.');
        return;
      }

      toast({
        title: 'Lease uploaded',
        description: 'Household members can now download the updated lease PDF.',
      });
      formRef.current?.reset();
    });
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-6"
      encType="multipart/form-data"
    >
      <div className="grid gap-2">
        <Label htmlFor="unit_id">Household ID</Label>
        <Input
          id="unit_id"
          name="unit_id"
          defaultValue={defaultUnitId ?? ''}
          required
          list={datalistId}
          placeholder="unit-uuid-or-slug"
        />
        {datalistId ? (
          <datalist id={datalistId}>
            {availableUnits.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Files are stored per household inside the secure docs bucket. Use the exact unit identifier
          that residents see in their profile.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">Lease title</Label>
        <Input id="title" name="title" defaultValue="Lease Agreement" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Add context such as renewal terms or roommate coverage."
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lease_start">Lease start</Label>
          <Input id="lease_start" name="lease_start" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lease_end">Lease end</Label>
          <Input id="lease_end" name="lease_end" type="date" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rent_amount">Monthly rent</Label>
        <Input
          id="rent_amount"
          name="rent_amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 4200"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Private notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Optional notes for property managers or renewal reminders."
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="file">Lease PDF</Label>
        <Input id="file" name="file" type="file" accept="application/pdf" required />
        <p className="text-xs text-muted-foreground">Only PDF uploads are allowed. Maximum size 25 MB.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Uploading…' : 'Upload lease'}
      </Button>
    </form>
  );
}
