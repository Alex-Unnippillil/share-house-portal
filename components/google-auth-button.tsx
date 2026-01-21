'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

import { createBrowserClient } from '@/lib/supabase-client';

export default function AuthButton() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        // Refresh page on sign in/out to server render correct state
        router.refresh();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);


  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google', // Or other providers like 'github', 'azure' etc.
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
     router.push('/'); // Redirect to home after sign out
     router.refresh(); // Ensure server state is updated
  };

  if (loading) {
    return <button className="animate-pulse rounded bg-gray-200 px-4 py-2 text-gray-600" disabled>Loading...</button>;
  }

  return user ? (
    <div className="flex items-center gap-4">
       <span className="hidden text-sm sm:inline">Hey, {user.email}!</span>
       <button onClick={handleSignOut} className="rounded-md bg-red-500 px-4 py-2 text-white no-underline hover:bg-red-600">
         Logout
       </button>
    </div>
  ) : (
    <button onClick={handleSignIn} className="rounded-md bg-blue-500 px-4 py-2 text-white no-underline hover:bg-blue-600">
      Login with Google
    </button>
  );
}