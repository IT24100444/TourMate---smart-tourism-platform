import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Hotel, 
  Bot, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles, 
  Clock,
  AlertTriangle 
} from 'lucide-react';
import apiClient from '../../api/client';

export default function OverviewDashboard({ onNavigate }) {
  const [counts, setCounts] = useState({
    places: 4,
    businesses: 2,
    complaints: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboardStats() {
      try {
        const [placesRes, bizRes, compRes] = await Promise.allSettled([
          apiClient.get('/tourism-places', { params: { status: 3, pageSize: 100 } }),
          apiClient.get('/businesses', { params: { status: 3, pageSize: 100 } }),
          apiClient.get('/admin/complaints'),
        ]);

        let placesCount = 4;
        if (placesRes.status === 'fulfilled') {
          const d = placesRes.value.data;
          const items = d?.data?.items || d?.items || (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : null);
          placesCount = d?.totalCount ?? d?.total ?? (items ? items.length : 4);
        }

        let bizCount = 2;
        if (bizRes.status === 'fulfilled') {
          const d = bizRes.value.data;
          const items = d?.data?.items || d?.items || (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : null);
          bizCount = d?.totalCount ?? d?.total ?? (items ? items.length : 2);
        }

        let remainingComplaints = 0;
        if (compRes.status === 'fulfilled') {
          const items = compRes.value.data?.data || compRes.value.data || [];
          const list = Array.isArray(items) ? items : [];
          remainingComplaints = list.filter(c => c.status !== 'WarningSent').length;
        }

        if (isMounted) {
          setCounts({
            places: placesCount,
            businesses: bizCount,
            complaints: remainingComplaints,
            loading: false,
          });
        }
      } catch {
        if (isMounted) {
          setCounts(prev => ({ ...prev, loading: false }));
        }
      }
    }

    fetchDashboardStats();
    return () => { isMounted = false; };
  }, []);

  const stats = [
    { 
      title: 'Approved Attractions', 
      value: `${counts.places} Places`, 
      comp: 'Tourism Places', 
      icon: MapPin, 
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      tab: 'places' 
    },
    { 
      title: 'Verified Businesses', 
      value: `${counts.businesses} Listed`, 
      comp: 'Hotel and Dining', 
      icon: Hotel, 
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100 text-blue-600',
      tab: 'businesses' 
    },
    { 
      title: 'Remaining Complaints', 
      value: `${counts.complaints} Remaining`, 
      comp: 'Booking Complains', 
      icon: AlertTriangle, 
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-100 text-purple-600',
      tab: 'booking-complaints' 
    },
    { 
      title: 'AI Itinerary Runs', 
      value: 'Waiting Approval', 
      comp: 'Agentic AI', 
      icon: Bot, 
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-600',
      tab: 'ai-workflows' 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Deep Royal Blue Card with Crisp White Text */}
      <div className="rounded-3xl p-8 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white shadow-xl shadow-blue-950/10 border border-blue-700/40 relative overflow-hidden">
        {/* Background decorative ambient glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs text-blue-200 font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Sri Lanka Tourism Unified Operations Platform</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            TourMate Integrated System
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed font-normal">
            Welcome to the centralized management hub. Explore verified tourism places, govern hotel and dining availability, manage bookings, and supervise multi-agent AI trip generation.
          </p>
        </div>
      </div>

      {/* Core Platform Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(s.tab)}
              className="bg-white p-5 rounded-2xl border border-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${s.badgeBg}`}>
                    {s.comp}
                  </span>
                  <div className={`p-2 rounded-xl ${s.iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-3 font-mono tracking-tight">
                  {s.value}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-700 transition-colors">
                  {s.title}
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture & Live Workflow Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enterprise Security Box */}
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Enterprise Security & Data Boundary</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 flex items-center justify-between transition-colors">
              <span className="text-slate-700 font-semibold">Authentication & RBAC</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold font-mono text-[11px]">
                JWT Bearer (ASP.NET Core 8)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 flex items-center justify-between transition-colors">
              <span className="text-slate-700 font-semibold">System of Record</span>
              <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold font-mono text-[11px]">
                PostgreSQL (Neon Cloud / EF Core)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 flex items-center justify-between transition-colors">
              <span className="text-slate-700 font-semibold">Multi-Agent Orchestrator</span>
              <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold font-mono text-[11px]">
                Python LangGraph (Internal Only)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 flex items-center justify-between transition-colors">
              <span className="text-slate-700 font-semibold">Clients Boundary</span>
              <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold font-mono text-[11px]">
                React Web & Flutter Mobile
              </span>
            </div>
          </div>
        </div>

        {/* Active Assessed Workflow Box */}
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
            <span>Active Assessed Workflow Trace</span>
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Flagship 2-day Ella trip (LKR 40,000 budget) validated through multi-agent collaboration and waiting for authorization.
          </p>
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-800 font-bold">Ella Rock & Nine Arch Bridge</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-black font-mono">
                LKR 35,500
              </span>
            </div>
            <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: '88.75%' }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-slate-600 font-medium">88.75% of budget allocated</span>
              <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded font-bold border border-amber-300/60">
                LKR 4,500 Buffer
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
