import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Database } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

import { HouseholdDocumentList } from './components/household-document-list';
import { HouseholdSelector } from './components/household-selector';
import { UploadLeaseForm } from './components/upload-lease-form';

type HouseholdDocumentRow = Database['public']['Tables']['household_documents']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type DocumentWithUploader = HouseholdDocumentRow & {
  uploader?: Pick<ProfileRow, 'full_name' | 'email'> | null;
};

type DocumentsPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatHouseholdLabel(unitId: string) {
  if (!unitId) {
    return 'Household';
  }

  return `Household ${unitId.slice(0, 8)}`;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, unit_id, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return (
      <div className="container max-w-4xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Profile required</CardTitle>
            <CardDescription>
              We could not load your household information. Please update your profile and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  const unitCandidates = new Set<string>();
  if (profile.unit_id) {
    unitCandidates.add(profile.unit_id);
  }

  const { data: knownUnits } = await supabase
    .from('household_documents')
    .select('unit_id')
    .not('unit_id', 'is', null);

  knownUnits?.forEach((row) => {
    if (row.unit_id) {
      unitCandidates.add(row.unit_id);
    }
  });

  const availableUnitIds = Array.from(unitCandidates).filter(Boolean).sort();

  const requestedUnit = toSingleValue(searchParams?.unit);

  let selectedUnitId: string | undefined;
  if (isAdmin) {
    selectedUnitId = requestedUnit || availableUnitIds[0];
  } else {
    selectedUnitId = profile.unit_id ?? undefined;
  }

  if (selectedUnitId && !availableUnitIds.includes(selectedUnitId)) {
    availableUnitIds.push(selectedUnitId);
    availableUnitIds.sort();
  }

  const unitOptions = availableUnitIds.map((unitId) => ({
    id: unitId,
    label: formatHouseholdLabel(unitId),
  }));

  let documents: DocumentWithUploader[] = [];

  if (selectedUnitId) {
    const { data: rows, error: documentError } = await supabase
      .from('household_documents')
      .select(
        `
          id,
          unit_id,
          title,
          description,
          file_name,
          file_path,
          lease_start,
          lease_end,
          metadata,
          file_size,
          content_type,
          uploaded_by,
          uploaded_at,
          uploader:profiles!household_documents_uploaded_by_fkey(full_name, email)
        `,
      )
      .eq('unit_id', selectedUnitId)
      .order('uploaded_at', { ascending: false });

    if (documentError) {
      console.error('Error loading household documents', documentError);
    }

    documents = (rows ?? []) as DocumentWithUploader[];
  }

  const showHouseholdSelector = isAdmin && unitOptions.length > 0;

  return (
    <div className="container max-w-6xl space-y-8 py-10">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Household documents</h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Review lease PDFs stored in the docs bucket and keep every roommate on the same page.
            </p>
          </div>
          {showHouseholdSelector ? (
            <HouseholdSelector
              availableUnits={unitOptions}
              selectedUnit={selectedUnitId}
              className="w-full max-w-xs"
            />
          ) : null}
        </div>
        {!isAdmin && selectedUnitId ? (
          <p className="text-sm text-muted-foreground">
            Documents are scoped to <span className="font-medium">{formatHouseholdLabel(selectedUnitId)}</span>.
          </p>
        ) : null}
        <Separator />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <HouseholdDocumentList
            documents={documents}
            selectedUnitId={selectedUnitId}
            isAdmin={isAdmin}
          />
        </section>

        {isAdmin ? (
          <aside>
            <Card>
              <CardHeader>
                <CardTitle>Upload lease PDF</CardTitle>
                <CardDescription>
                  Admin uploads are limited to PDF files and automatically scoped to the selected household.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadLeaseForm
                  availableUnits={availableUnitIds}
                  defaultUnitId={selectedUnitId}
                />
              </CardContent>
            </Card>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
