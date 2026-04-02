'use client';

import React from 'react';
import Link from 'next/link';
import type { UserRole } from '@/lib/types/database';

interface User {
  email: string;
  full_name: string;
  role: UserRole;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-50 bg-primary-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Site Name */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight">コーチング学習サイト</h1>
          </div>

          {/* User Info and Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-primary-100">{user.email}</p>
            </div>

            {/* Admin Dashboard Link */}
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="px-3 py-2 text-sm font-medium rounded-md bg-primary-600 hover:bg-primary-500 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
