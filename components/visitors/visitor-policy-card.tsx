import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VISITOR_POLICY } from "@/lib/data/visitors";

export function VisitorPolicyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stay Limits</CardTitle>
        <CardDescription>
          Overnight guests can stay up to {VISITOR_POLICY.maxConsecutiveNights} consecutive nights per visit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Requests exceeding the limit are blocked before submission.</li>
          <li>• Back-to-back bookings for the same guest count toward the streak.</li>
          <li>• Managers can review exceptions from the visitor log in Supabase.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
