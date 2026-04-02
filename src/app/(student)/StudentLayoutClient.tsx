'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import type { Profile } from '@/lib/types/database';

export default function StudentLayoutClient({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={{
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        }}
        onLogout={handleLogout}
      />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
