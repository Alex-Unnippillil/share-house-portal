import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MaintenanceStageKey } from "@/lib/maintenance/types";

export interface StageDefinition {
  key: MaintenanceStageKey;
  title: string;
  description: string;
}

interface StageProgressProps {
  stages: StageDefinition[];
  currentStage: MaintenanceStageKey;
  className?: string;
}

export function StageProgress({ stages, currentStage, className }: StageProgressProps) {
  const currentIndex = Math.max(
    stages.findIndex((stage) => stage.key === currentStage),
    0,
  );

  return (
    <ol className={cn("relative space-y-4", className)}>
      {stages.map((stage, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li key={stage.key} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              {isComplete ? (
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className={cn("mt-1 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground/60")} />
              )}
              {index !== stages.length - 1 && (
                <span
                  className={cn(
                    "mt-1 w-px flex-1 bg-border",
                    isComplete ? "bg-emerald-500/60" : isActive ? "bg-primary/70" : "bg-border/80",
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className={cn("text-sm font-medium", isActive ? "text-primary" : undefined)}>{stage.title}</p>
              <p className="text-xs text-muted-foreground">{stage.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
