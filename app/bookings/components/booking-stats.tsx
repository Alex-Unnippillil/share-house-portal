import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Clock, Users } from 'lucide-react';

export function BookingStats() {
  const stats = [
    { title: 'This week', value: '8 bookings', Icon: CalendarCheck },
    { title: 'Avg duration', value: '1.7 hours', Icon: Clock },
    { title: 'Participants', value: '12 roommates', Icon: Users },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
            <s.Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BookingStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="size-5 rounded-full bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-28 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



