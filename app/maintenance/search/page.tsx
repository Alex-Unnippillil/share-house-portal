import { MaintenanceSearchExperience } from "@/components/maintenance/maintenance-search-experience";

export default function MaintenanceSearchPage() {
  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Search maintenance</h1>
        <p className="text-muted-foreground">
          Review household work orders, triage urgent issues, and log new requests without leaving the portal.
        </p>
      </header>
      <MaintenanceSearchExperience />
    </div>
  );
}
