import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getDocumentStatsAction } from '../actions';

export async function DocumentsStats() {
  const result = await getDocumentStatsAction();

  if (!result.success || !result.data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents unavailable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {result.error || 'Unable to load document statistics.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = result.data;

  const statItems = [
    {
      title: "Total Documents",
      value: stats.total_documents,
      icon: FileText,
      color: "text-blue-600",
      description: "All document types",
    },
    {
      title: "Pending Signatures",
      value: stats.pending_signatures,
      icon: Clock,
      color: "text-yellow-600",
      description: "Awaiting signatures",
    },
    {
      title: "Signed Documents",
      value: stats.signed_documents,
      icon: CheckCircle,
      color: "text-green-600",
      description: "Fully executed",
    },
    {
      title: "Expired Documents",
      value: stats.expired_documents,
      icon: AlertCircle,
      color: "text-red-600",
      description: "Past expiry date",
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.title}
            </CardTitle>
            <item.icon className={`size-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
