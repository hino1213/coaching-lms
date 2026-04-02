'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';

const navItems = [
  { href: '/admin/dashboard', label: 'ダッシュボード', icon: '📊' },
  { href: '/admin/courses', label: '講座管理', icon: '📚' },
  { href: '/admin/students', label: '受講生管理', icon: '👥' },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* トップバー */}
      <header className="sticky top-0 z-50 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/admin/dashboard" className="font-bold text-lg">
                管理者パネル
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm transition ${
                      pathname.startsWith(item.href)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white transition"
              >
                受講生画面へ
              </Link>
              <span className="text-sm text-gray-400">
                {profile.full_name || profile.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 transition"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* モバイルナビ */}
        <nav className="sm:hidden border-t border-gray-800 flex">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2 text-sm ${
                pathname.startsWith(item.href)
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
