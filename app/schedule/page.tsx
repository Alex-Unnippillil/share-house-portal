// app/schedule/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ScheduleForm } from '@/components/schedule-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { createServerClient } from '@/lib/supabase-client';

export default async function SchedulePage() {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth'); // Redirect to login if not authenticated
    }

    // Optional: Fetch existing meetings for display
    // const { data: meetings, error } = await supabase
    //    .from('meetings')
    //    .select('*')
    //    .eq('user_id', user.id)
    //    .order('start_time', { ascending: true });

    return (
        <div className="container mx-auto flex justify-center p-4 pt-10">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Schedule a New Meeting</CardTitle>
                    <CardDescription>
                        Fill in the details below to create a Google Calendar event with a Meet link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScheduleForm userEmail={user.email!} userName={user.user_metadata?.full_name || user.email!} />
                </CardContent>
            </Card>
            {/* Toaster must be included in your layout or page for toasts to work */}
            <Toaster />
        </div>
    );
}