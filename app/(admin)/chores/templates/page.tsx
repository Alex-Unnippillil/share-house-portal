import TemplateManager from "./template-manager";

import { createSupbaseServerClient } from "@/utils/supaone";
import type { Tables } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ChoreTemplatesPage() {
  const supabase = await createSupbaseServerClient();

  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .order("title", { ascending: true });

  const templates = (data ?? []) as Tables<"chores">[];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Chore templates</h1>
        <p className="text-muted-foreground">
          Manage the baseline tasks that populate every property&apos;s chore board.
        </p>
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load chore templates from the database. Please refresh the page.
        </div>
      )}
      <TemplateManager templates={templates} />
    </div>
  );
}
