import React from 'react';
import {
  Compass, MapPin, Hotel, CalendarCheck, Bot,
  Layers, ShieldCheck, LogOut, User, AlertTriangle, Star
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'overview',           label: 'Command Center',       icon: Layers,         badge: null,              roles: ['Administrator'] },
  { id: 'places',             label: 'Tourism Places',       icon: MapPin,          badge: null,              roles: ['Administrator'] },
  { id: 'businesses',         label: 'Hotel and Dining',     icon: Hotel,           badge: null,              roles: ['Administrator', 'BusinessOwner'] },
  { id: 'bookings',           label: 'Booking Queue',        icon: CalendarCheck,   badge: null,              roles: ['BusinessOwner'] },
  { id: 'booking-reviews',    label: 'Booking Reviews',      icon: Star,            badge: null,              roles: ['BusinessOwner'] },
  { id: 'places-reviews',     label: 'Places Reviews',       icon: Compass,         badge: null,              roles: ['Administrator'] },
  { id: 'booking-complaints', label: 'Booking Complains',     icon: AlertTriangle,   badge: null,              roles: ['Administrator'] },
  { id: 'ai-workflows',       label: 'Agentic AI',           icon: Bot,             badge: 'Live',  highlight: true, roles: ['Administrator'] },
];

const ROLE_COLORS = {
  Administrator: 'bg-blue-100 text-blue-700 border border-blue-200',
  BusinessOwner: 'bg-amber-100 text-amber-700 border border-amber-200',
  Tourist:       'bg-green-100 text-green-700 border border-green-200',
};

export default function Sidebar({ activeTab, setActiveTab }) {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="w-64 bg-white border-r border-blue-100 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-blue-100">
          <img src="/logo.png" alt="TourMate Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-blue-900">
              Tour<span className="text-blue-500">Mate</span>
            </h1>
            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
              Sri Lanka Travels
            </p>
          </div>
        </div>

        {/* Current user info */}
        {user && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-950 truncate">{user.fullName || user.email}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[role] || ROLE_COLORS.Tourist}`}>
                {role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="px-3 py-5 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Navigation
          </div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-blue-400'}`} style={{width:'18px',height:'18px'}} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.highlight
                      ? isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600 animate-pulse'
                      : isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-blue-100">
        {/* Logout */}
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
