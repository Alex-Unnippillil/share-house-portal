import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/server';
import { format } from 'date-fns';

function asCurrency(amount: number | null, currency: string | null) {
  if (!amount || !currency) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

export async function TenantHistoryTimelines() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return null;
  }

  const [{ data: leaseHistory }, { data: paymentHistory }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, status, created_at, signed_at, expires_at, version, document_type')
      .eq('document_type', 'lease')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('rent_payments')
      .select('id, amount, currency, status, created_at, processed_at, description')
      .or(`tenant_id.eq.${userId},user_id.eq.${userId}`)
      .order('processed_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lease History Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(leaseHistory ?? []).map((lease) => (
            <div key={lease.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{lease.title}</p>
                <Badge variant="outline">v{lease.version || 1}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Created {format(new Date(lease.created_at || Date.now()), 'MMM d, yyyy')}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {lease.signed_at && <span>Signed {format(new Date(lease.signed_at), 'MMM d, yyyy')}</span>}
                {lease.expires_at && <span>Expires {format(new Date(lease.expires_at), 'MMM d, yyyy')}</span>}
              </div>
            </div>
          ))}
          {(leaseHistory ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No lease history available yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial History Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(paymentHistory ?? []).map((payment) => (
            <div key={payment.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{asCurrency(payment.amount, payment.currency)}</p>
                <Badge variant={payment.status === 'succeeded' || payment.status === 'completed' ? 'default' : 'secondary'}>
                  {payment.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{payment.description || 'Rent payment'}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {format(new Date(payment.processed_at || payment.created_at || Date.now()), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          ))}
          {(paymentHistory ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No payment history available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
