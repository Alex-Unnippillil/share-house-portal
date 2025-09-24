import { formatDistanceToNow } from "date-fns";

import { MaintenanceRequestFormCard } from "@/components/maintenance/maintenance-request-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MaintenancePriority, MaintenanceStageKey, MaintenanceTriageState } from "@/lib/maintenance/types";
import { StageProgress, type StageDefinition } from "./_components/stage-progress";
import { SlaCountdown } from "./_components/sla-countdown";
import { WorkProofUpload } from "./_components/work-proof-upload";

const maintenanceHighlights = [
  {
    title: "Stage-aware triage",
    description: "See exactly where each ticket sits with live triage state and vendor assignments.",
  },
  {
    title: "Live SLA timers",
    description: "Countdowns surface when response or resolution deadlines are at risk.",
  },
  {
    title: "Photo evidence",
    description: "Attach on-site photos from tenants or vendors to keep the audit trail complete.",
  },
];

const stageDefinitions: StageDefinition[] = [
  { key: "reported", title: "Reported", description: "Resident submitted the ticket." },
  { key: "triaged", title: "Triaged", description: "Property manager scoped the issue." },
  { key: "vendor", title: "Vendor assigned", description: "External vendor engaged and dispatched." },
  { key: "in_progress", title: "On-site work", description: "Technician is working the issue." },
  { key: "completed", title: "Completed", description: "Fix verified and tenant notified." },
];

const priorityVariants: Record<MaintenancePriority, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  normal: "secondary",
  high: "default",
  urgent: "destructive",
};

const triageLabels: Record<MaintenanceTriageState, string> = {
  untriaged: "Awaiting review",
  in_review: "In review",
  escalated: "Escalated",
  resolved: "Resolved",
};

type ActiveRequest = {
  id: string;
  title: string;
  stage: MaintenanceStageKey;
  priority: MaintenancePriority;
  triageState: MaintenanceTriageState;
  status: string;
  unitId: string;
  requestedAt: string;
  slaResponseDueAt: string;
  slaResolutionDueAt: string;
  firstResponseAt: string | null;
  vendor?: { name: string; contact: string; eta?: string };
  notes: string;
  photoCount: number;
};

const activeRequests: ActiveRequest[] = [
  {
    id: "req-hvac-482",
    title: "HVAC airflow imbalance",
    stage: "in_progress",
    priority: "urgent",
    triageState: "escalated",
    status: "in_progress",
    unitId: "unit-3b",
    requestedAt: "2025-03-02T13:35:00.000Z",
    slaResponseDueAt: "2025-03-02T15:35:00.000Z",
    slaResolutionDueAt: "2025-03-03T01:35:00.000Z",
    firstResponseAt: "2025-03-02T14:05:00.000Z",
    vendor: { name: "ClimateRight HVAC", contact: "dispatch@climateright.com", eta: "2025-03-02T18:15:00.000Z" },
    notes: "Compressor short cycling and ambient temps spiking above 82°F in living room.",
    photoCount: 3,
  },
  {
    id: "req-plumb-198",
    title: "Shower valve temperature fluctuation",
    stage: "vendor",
    priority: "high",
    triageState: "in_review",
    status: "awaiting_vendor",
    unitId: "unit-3b",
    requestedAt: "2025-03-01T09:20:00.000Z",
    slaResponseDueAt: "2025-03-01T15:20:00.000Z",
    slaResolutionDueAt: "2025-03-04T09:20:00.000Z",
    firstResponseAt: null,
    vendor: { name: "NorthPoint Plumbing", contact: "service@northpointplumbing.com" },
    notes: "Temperature swings 20°F mid-shower; tenant captured video evidence.",
    photoCount: 1,
  },
];

export default function MaintenancePage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Requests</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Report household issues, follow triage progress, and keep service-level agreements on track.
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <MaintenanceRequestFormCard />

          <Card>
            <CardHeader>
              <CardTitle>Upload field documentation</CardTitle>
              <CardDescription>
                Share vendor photos or completion receipts to append them to the live maintenance ticket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkProofUpload requestId={activeRequests[0].id} unitId={activeRequests[0].unitId} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active maintenance queue</CardTitle>
              <CardDescription>
                Track stage progression, vendor engagement, and SLA timers for every outstanding request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeRequests.map((request) => (
                <div key={request.id} className="space-y-4 rounded-lg border border-border/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">{request.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Reported {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariants[request.priority]} className="uppercase">
                        {request.priority} priority
                      </Badge>
                      <Badge variant="outline">{triageLabels[request.triageState]}</Badge>
                      <Badge variant="outline">{request.photoCount} photo(s)</Badge>
                    </div>
                  </div>

                  <StageProgress stages={stageDefinitions} currentStage={request.stage} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SlaCountdown
                      target={request.slaResponseDueAt}
                      startedAt={request.firstResponseAt}
                      label="Response SLA"
                    />
                    <SlaCountdown target={request.slaResolutionDueAt} label="Resolution SLA" />
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">Next steps</p>
                    <p className="text-muted-foreground">{request.notes}</p>
                    {request.vendor ? (
                      <p className="text-muted-foreground">
                        Vendor: <span className="font-medium text-foreground">{request.vendor.name}</span> · Contact {request.vendor.contact}
                        {request.vendor.eta ? ` · ETA ${new Date(request.vendor.eta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {maintenanceHighlights.map((item) => (
              <Card key={item.title} className="border-dashed">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
