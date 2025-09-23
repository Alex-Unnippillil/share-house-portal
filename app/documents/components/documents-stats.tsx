'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react"

import { DocumentStats } from "@/types/documents"

import { getDocumentStatsAction } from "../actions"
import { DocumentsStatsSkeleton } from "./documents-skeletons"

export function DocumentsStats() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getDocumentStatsAction();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching document stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <DocumentsStatsSkeleton />
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      title: "Total Documents",
      value: stats.total_documents,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Pending Signatures",
      value: stats.pending_signatures,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Signed Documents",
      value: stats.signed_documents,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Expired Documents",
      value: stats.expired_documents,
      icon: AlertCircle,
      color: "text-red-600",
    },
  ];

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
            <p className="text-xs text-muted-foreground">
              {item.title === "Total Documents" && "All document types"}
              {item.title === "Pending Signatures" && "Awaiting signatures"}
              {item.title === "Signed Documents" && "Fully executed"}
              {item.title === "Expired Documents" && "Past expiry date"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
