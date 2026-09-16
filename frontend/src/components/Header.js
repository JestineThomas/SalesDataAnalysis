'use client';

import React from 'react';
import { Menu, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMenuClick, title }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">{title || 'Dashboard'}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
          {user?.role === 'admin' ? (
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          ) : (
            <UserCheck className="w-4 h-4 text-teal-600" />
          )}
          <span className="text-xs font-medium text-slate-700">{user?.full_name}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 border-l border-slate-200 pl-2">
            {user?.role}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200/70 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
