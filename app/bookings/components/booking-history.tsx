import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          <CardHeader>
            <CardTitle className="text-base">{x.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{x.when}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



