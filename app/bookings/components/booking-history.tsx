"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FavoriteToggle } from '@/components/navigation/FavoriteToggle';

export function BookingHistory() {
  // Placeholder history list
  const items = [
    { id: '1', title: 'Kitchen', when: 'Yesterday 6–8pm' },
    { id: '2', title: 'TV Room', when: 'Last Sat 7–10pm' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((x) => (
        <Card key={x.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-base">{x.title}</CardTitle>
            <FavoriteToggle
              entityType="booking"
              entityId={x.id}
              metadata={{
                title: `${x.title} booking`,
                subtitle: x.when,
                description: `Recent reservation for the ${x.title.toLowerCase()}`,
                href: '/bookings',
                badge: 'Booking',
              }}
              label={`Toggle favorite for ${x.title} booking`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{x.when}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



