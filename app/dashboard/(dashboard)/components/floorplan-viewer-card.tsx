import { Home } from "lucide-react"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"

import { getFloorplanWorkspace } from "../data"
import { FloorplanWorkspaceClient } from "./floorplan-workspace-client"

export async function FloorplanViewerCard() {
  const workspace = await getFloorplanWorkspace()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="size-5 text-primary" />
          Floorplan overlays
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          View and annotate room/storage/chore markers with roommate-specific
          visibility.
        </p>
      </CardHeader>

      <FloorplanWorkspaceClient
        floorplanName={workspace.floorplanName}
        svgMarkup={workspace.svgMarkup}
        currentVersion={workspace.currentVersion}
        currentUserId={workspace.currentUserId}
        currentUserRole={workspace.currentUserRole}
        roommates={workspace.roommates}
        initialAnnotations={workspace.annotations}
        history={workspace.annotationHistory}
      />
    </Card>
  )
}
