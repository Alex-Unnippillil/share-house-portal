import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/icons';

export function BookingStats() {
  const stats = [
    { title: 'This week', value: '8 bookings', icon: 'calendar-check' as const },
    { title: 'Avg duration', value: '1.7 hours', icon: 'clock' as const },
    { title: 'Participants', value: '12 roommates', icon: 'users' as const },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
            <Icon name={s.icon} className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



