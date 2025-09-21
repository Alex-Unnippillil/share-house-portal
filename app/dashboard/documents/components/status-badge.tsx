import { Badge } from "@/components/ui/badge";
import {
  DocumentStatus,
  getStatusLabel,
  getStatusVariant,
} from "@/lib/documents-service";

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <Badge className={className} variant={getStatusVariant(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
