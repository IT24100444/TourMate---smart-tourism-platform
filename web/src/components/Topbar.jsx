import React from 'react';
import { Database, Activity, Bell, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const ROLE_COLORS = {
  Administrator: 'bg-blue-100 text-blue-700',
  BusinessOwner: 'bg-amber-100 text-amber-700',
  Tourist:       'bg-green-100 text-green-700',
};

export default function Topbar() {
  const { user, role } = useAuth();

  return (
    <header className="h-16 border-b border-blue-100 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Status pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-green-700 font-medium">API Online</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <Database className="w-3.5 h-3.5 text-blue-500" />
          <span>Neon PostgreSQL</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700">
          <Activity className="w-3.5 h-3.5 text-purple-500" />
          <span>AI Agents Active</span>
        </div>
      </div>

      {/* Right: User info */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button
          id="topbar-notifications"
          className="relative w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
        </button>

        {/* User avatar + info */}
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-blue-100">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="font-semibold text-slate-800 text-sm leading-tight truncate max-w-[140px]">
                {user.fullName || user.email}
              </p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || ROLE_COLORS.Tourist}`}>
                {role}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
