import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Star,
  Search,
  RefreshCw,
  Compass,
  User,
  Calendar,
  ShieldCheck,
  Filter,
  Eye,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export default function PlacesReviews() {
  const { role } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | '3' | '1-2'
  const [placeFilter, setPlaceFilter] = useState('all');

  const fetchPlaceReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reviews/places/admin');
      const items = res.data?.data || res.data || [];
      setReviews(Array.isArray(items) ? items : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaceReviews();
  }, [fetchPlaceReviews]);

  // Unique places for dropdown filter
  const uniquePlaces = useMemo(() => {
    const map = new Map();
    reviews.forEach(r => {
      if (r.placeId && r.placeName && !map.has(r.placeId)) {
        map.set(r.placeId, r.placeName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { total: 0, avgRating: 0, fiveStarPct: 0, uniqueTourists: 0 };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avgRating = (sum / total).toFixed(1);
    const fiveStarCount = reviews.filter(r => r.rating === 5).length;
    const fiveStarPct = Math.round((fiveStarCount / total) * 100);
    const uniqueTourists = new Set(reviews.map(r => r.touristUserId)).size;
    return { total, avgRating, fiveStarPct, uniqueTourists };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Place filter
      if (placeFilter !== 'all' && r.placeId !== placeFilter) {
        return false;
      }
      // Rating filter
      if (ratingFilter === '5' && r.rating !== 5) return false;
      if (ratingFilter === '4' && r.rating !== 4) return false;
      if (ratingFilter === '3' && r.rating !== 3) return false;
      if (ratingFilter === '1-2' && r.rating > 2) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPlace = r.placeName?.toLowerCase().includes(q);
        const matchTourist = r.touristName?.toLowerCase().includes(q) || r.touristEmail?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        const matchDistrict = r.placeDistrict?.toLowerCase().includes(q);
        return matchPlace || matchTourist || matchComment || matchDistrict;
      }
      return true;
    });
  }, [reviews, placeFilter, ratingFilter, searchQuery]);

  if (role !== 'Administrator') {
    return (
      <div className="bg-white p-12 rounded-3xl border border-red-100 text-center space-y-3">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-500">Only platform Administrators are authorized to view the Places Review Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Attraction Oversight</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-600" />
              <span>Admin Read-Only Audit</span>
            </span>
          </div>
          <h2 className="text-2xl font-black text-blue-950 tracking-tight">
            Places Reviews Moderation
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Monitor real tourist impressions and ratings across Sri Lanka's cultural, coastal, and wildlife attractions. Preserves tourist voices in read-only audit format.
          </p>
        </div>

        <button
          onClick={fetchPlaceReviews}
          className="p-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-2 text-xs font-bold self-start lg:self-auto shadow-sm"
          title="Refresh Places Reviews"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Place Reviews</p>
            <h4 className="text-xl font-black text-blue-950 mt-0.5">{stats.total} Submitted</h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Average Rating</p>
            <h4 className="text-xl font-black text-blue-950 mt-0.5">
              {stats.avgRating > 0 ? `${stats.avgRating} / 5.0` : '—'}
            </h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">5-Star Satisfaction</p>
            <h4 className="text-xl font-black text-blue-950 mt-0.5">{stats.fiveStarPct}% High Praise</h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Reviewers</p>
            <h4 className="text-xl font-black text-blue-950 mt-0.5">{stats.uniqueTourists} Tourists</h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tourist name, place name, district, or review keyword..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Place Dropdown */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={placeFilter}
              onChange={(e) => setPlaceFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tourism Places ({uniquePlaces.length})</option>
              {uniquePlaces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rating Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Rating:
          </span>
          {[
            { id: 'all', label: 'All Ratings', count: reviews.length },
            { id: '5', label: '5 Stars ★★★★★', count: reviews.filter(r => r.rating === 5).length },
            { id: '4', label: '4 Stars ★★★★', count: reviews.filter(r => r.rating === 4).length },
            { id: '3', label: '3 Stars ★★★', count: reviews.filter(r => r.rating === 3).length },
            { id: '1-2', label: '1-2 Stars ★★/★', count: reviews.filter(r => r.rating <= 2).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRatingFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                ratingFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                ratingFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3 shadow-sm">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading tourist attraction reviews…</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3 shadow-sm">
            <Compass className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-blue-950">No Place Reviews Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || ratingFilter !== 'all' || placeFilter !== 'all'
                ? 'No tourist place reviews matched your filter criteria. Try clearing search filters.'
                : 'No tourist place reviews have been submitted yet. When tourists review attractions in the mobile app, they will appear here.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((r) => (
            <div
              key={r.id}
              className="p-6 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 transition-all space-y-4 shadow-sm"
            >
              {/* Review Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Attraction Badge */}
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{r.placeName || 'Attraction'}</span>
                  </span>

                  {/* District / Category Badge */}
                  {r.placeDistrict && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                      {r.placeDistrict}
                    </span>
                  )}
                  {r.placeCategory && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      {r.placeCategory}
                    </span>
                  )}

                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Tourism Place</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Tourist & Star Rating Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
                    {r.touristName ? r.touristName.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950 flex items-center gap-1.5">
                      <span>{r.touristName || 'Verified Tourist'}</span>
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                        {r.touristEmail || 'tourist'}
                      </span>
                    </h4>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < r.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200 fill-slate-100'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1.5">
                        {r.rating}.0 / 5.0
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Read Only</span>
                </div>
              </div>

              {/* Review Comment Quote */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                "{r.comment}"
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
