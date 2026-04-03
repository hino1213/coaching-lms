'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';

const navItems = [
  { href: '/admin/dashboard', label: 'ããã·ã¥ãã¼ã', icon: 'ð' },
  { href: '/admin/courses', label: 'è¬åº§ç®¡ç', icon: 'ð' },
  { href: '/admin/students', label: 'åè¬çç®¡ç', icon: 'ð¥' },
];

export default function AdminLayoutClient({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // ãã¼ã¸é·ç§»å®äºæã«ã­ã¼ãã£ã³ã°ç¶æããªã»ãã
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ããããã¼ */}
      <header className="sticky top-0 z-50 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/admin/dashboard" className="font-bold text-lg">
                ç®¡çèããã«
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map(item => {
                  const isActive = pathname.startsWith(item.href);
                  const isNavigating = navigatingTo === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (!isActive) setNavigatingTo(item.href);
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {isNavigating ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>{item.icon}</span>
                      )}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                åè¬çç»é¢ã¸
              </Link>
              <span className="text-sm text-gray-400">
                {profile.full_name || profile.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 transition"
              >
                ã­ã°ã¢ã¦ã
              </button>
            </div>
          </div>
        </div>

        {/* ã¢ãã¤ã«ãã */}
        <nav className="sm:hidden border-t border-gray-800 flex">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            const isNavigating = navigatingTo === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (!isActive) setNavigatingTo(item.href);
                }}
                className={`flex-1 text-center py-2 text-sm flex items-center justify-center gap-1 ${
                  isActive ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
              >
                {isNavigating ? (
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                ) : (
                  item.icon
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
