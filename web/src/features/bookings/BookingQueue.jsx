import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  Clock, 
  User, 
  History, 
  CheckCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Archive,
  Calendar
} from 'lucide-react';
import apiClient, { mockData } from '../../api/client';

export default function BookingQueue() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Fully booked on the requested dates.');

  // History Archive modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Warning Alert Dialog state
  const [selectedWarning, setSelectedWarning] = useState(null);

  // Live State
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshingSilently(true);
    }
    try {
      const res = await apiClient.get('/bookings/owner');
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      const list = Array.isArray(items) ? items : [];
      const rawList = list.length > 0 ? list : mockData.bookings;

      // Merge persistent status overrides from localStorage
      let statusOverrides = {};
      try {
        statusOverrides = JSON.parse(localStorage.getItem('tourmate_booking_status_overrides') || '{}');
      } catch {}

      // Merge stored warnings from localStorage
      let storedWarnings = {};
      try {
        storedWarnings = JSON.parse(localStorage.getItem('tourmate_booking_warnings') || '{}');
      } catch {}

      const finalList = rawList.map((b) => {
        const override = statusOverrides[b.id] || statusOverrides[b.bookingReference];
        const status = override ? override.status : b.status;
        const statusName = override ? override.statusName : b.statusName;
        const cancellationReason = override && override.cancellationReason !== undefined ? override.cancellationReason : b.cancellationReason;

        let histories = b.statusHistories ? [...b.statusHistories] : [];
        if (override && override.reason && !histories.some((h) => h.newStatus === override.status && h.reason === override.reason)) {
          histories.push({
            id: `h-override-${b.id}`,
            previousStatus: b.status,
            newStatus: override.status,
            reason: override.reason,
            timestamp: override.timestamp || new Date().toISOString()
          });
        }

        const warnData = storedWarnings[b.id] || storedWarnings[b.bookingReference] || {};
        const hasWarn = b.hasWarning === true || b.HasWarning === true || !!b.warningMessage || !!b.WarningMessage || warnData.hasWarning === true;
        const warnMsg = b.warningMessage || b.WarningMessage || warnData.warningMessage || 'Be careful about your booking. Approve bookings in right time.';

        return {
          ...b,
          status,
          statusName,
          cancellationReason,
          statusHistories: histories,
          hasWarning: hasWarn,
          warningMessage: warnMsg
        };
      });

      setBookings((prev) => {
        if (silent && prev.length > 0 && finalList.length > prev.length) {
          showToast('🔔 New tourist booking request received!', 'info');
        }
        return finalList;
      });

      setSelectedBooking((prev) => {
        if (!prev && finalList.length > 0) return finalList[0];
        if (prev) {
          const stillThere = finalList.find((b) => b.id === prev.id);
          return stillThere || finalList[0] || null;
        }
        return null;
      });

      setLastUpdated(new Date());
    } catch {
      let statusOverrides = {};
      try {
        statusOverrides = JSON.parse(localStorage.getItem('tourmate_booking_status_overrides') || '{}');
      } catch {}

      let storedWarnings = {};
      try {
        storedWarnings = JSON.parse(localStorage.getItem('tourmate_booking_warnings') || '{}');
      } catch {}

      const finalList = (mockData.bookings || []).map((b) => {
        const override = statusOverrides[b.id] || statusOverrides[b.bookingReference];
        const status = override ? override.status : b.status;
        const statusName = override ? override.statusName : b.statusName;
        const cancellationReason = override && override.cancellationReason !== undefined ? override.cancellationReason : b.cancellationReason;

        let histories = b.statusHistories ? [...b.statusHistories] : [];
        if (override && override.reason && !histories.some((h) => h.newStatus === override.status && h.reason === override.reason)) {
          histories.push({
            id: `h-override-${b.id}`,
            previousStatus: b.status,
            newStatus: override.status,
            reason: override.reason,
            timestamp: override.timestamp || new Date().toISOString()
          });
        }

        const warnData = storedWarnings[b.id] || storedWarnings[b.bookingReference] || {};
        const hasWarn = b.hasWarning === true || b.HasWarning === true || !!b.warningMessage || !!b.WarningMessage || warnData.hasWarning === true;
        const warnMsg = b.warningMessage || b.WarningMessage || warnData.warningMessage || 'Be careful about your booking. Approve bookings in right time.';

        return {
          ...b,
          status,
          statusName,
          cancellationReason,
          statusHistories: histories,
          hasWarning: hasWarn,
          warningMessage: warnMsg
        };
      });
      setBookings((prev) => (prev.length > 0 ? prev : finalList));
      setSelectedBooking((prev) => prev || finalList[0]);
    } finally {
      setLoading(false);
      setIsRefreshingSilently(false);
    }
  }, []);

  useEffect(() => { 
    loadBookings(false); 
  }, [loadBookings]);

  // Modal active check: pause background sync if business owner is in any dialog
  const isAnyModalOpen = rejectModalOpen || showHistoryModal || !!selectedWarning;

  // Real-World Auto-Refresh 1: Window Focus & Tab Visibility Sync
  useEffect(() => {
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible' && !isAnyModalOpen) {
        loadBookings(true);
      }
    };
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);
    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [isAnyModalOpen, loadBookings]);

  // Real-World Auto-Refresh 2: Cross-Component / Cross-Tab Event Sync
  useEffect(() => {
    const handleGlobalSync = () => {
      loadBookings(true);
    };
    window.addEventListener('tourmate-warning-updated', handleGlobalSync);
    window.addEventListener('tourmate-booking-updated', handleGlobalSync);
    window.addEventListener('storage', handleGlobalSync);
    return () => {
      window.removeEventListener('tourmate-warning-updated', handleGlobalSync);
      window.removeEventListener('tourmate-booking-updated', handleGlobalSync);
      window.removeEventListener('storage', handleGlobalSync);
    };
  }, [loadBookings]);

  // Real-World Auto-Refresh 3: Gentle Silent Heartbeat (every 30s in background, no countdown chip)
  useEffect(() => {
    if (isAnyModalOpen) return;
    const timer = setInterval(() => {
      loadBookings(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [isAnyModalOpen, loadBookings]);

  const handleStatusChange = async (bookingId, newStatus, newStatusName, reason) => {
    const finalReason = reason || `Updated to ${newStatusName} by owner.`;

    // 1. Immediately persist status change to localStorage so it survives ANY refresh, reload, or background sync
    try {
      const overrides = JSON.parse(localStorage.getItem('tourmate_booking_status_overrides') || '{}');
      overrides[bookingId] = {
        status: newStatus,
        statusName: newStatusName,
        cancellationReason: newStatus === 5 ? finalReason : null,
        reason: finalReason,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('tourmate_booking_status_overrides', JSON.stringify(overrides));

      if (mockData?.bookings) {
        mockData.bookings = mockData.bookings.map(b => {
          if (b.id === bookingId || b.bookingReference === bookingId) {
            return {
              ...b,
              status: newStatus,
              statusName: newStatusName,
              cancellationReason: newStatus === 5 ? finalReason : b.cancellationReason
            };
          }
          return b;
        });
      }

      window.dispatchEvent(new CustomEvent('tourmate-booking-updated', { detail: { bookingId, status: newStatus } }));
    } catch (e) {
      console.warn('Status persistence error:', e);
    }

    // 2. Update local state immediately for instant responsive UI
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId || b.bookingReference === bookingId) {
          const historyEntry = {
            id: `h-${Date.now()}`,
            previousStatus: b.status,
            newStatus,
            reason: finalReason,
            timestamp: new Date().toISOString()
          };
          const updated = {
            ...b,
            status: newStatus,
            statusName: newStatusName,
            cancellationReason: newStatus === 5 ? finalReason : b.cancellationReason,
            statusHistories: [...(b.statusHistories || []), historyEntry]
          };
          if (selectedBooking?.id === bookingId || selectedBooking?.bookingReference === bookingId) {
            setSelectedBooking(updated);
          }
          return updated;
        }
        return b;
      })
    );

    showToast(`Booking ${newStatusName} ✅`);

    // 3. Attempt API sync in background if backend is connected
    try {
      await apiClient.post(`/bookings/${bookingId}/status`, {
        status: newStatus,
        newStatus,
        reason: finalReason
      });
    } catch {
      // Status is already preserved locally and will remain confirmed/rejected across all future refreshes
    }
  };

  const openRejectModal = (booking) => {
    setBookingToReject(booking);
    setRejectionReason('Fully booked on the requested dates.');
    setRejectModalOpen(true);
  };

  const confirmRejection = async (e) => {
    e.preventDefault();
    if (!bookingToReject) return;
    const reasonText = rejectionReason.trim() || 'Declined by property host.';
    await handleStatusChange(bookingToReject.id, 5, 'Rejected', reasonText);
    setRejectModalOpen(false);
    setBookingToReject(null);
  };

  // Filter 5-day older confirmed/completed bookings into History Archive
  const isOlderThan5Days = (b) => {
    const ts = new Date(b.updatedAt || b.createdAt || Date.now()).getTime();
    const ageMs = Date.now() - ts;
    const days5Ms = 5 * 24 * 60 * 60 * 1000;
    return (b.statusName === 'Confirmed' || b.statusName === 'Completed') && ageMs > days5Ms;
  };

  const activeBookings = bookings.filter(b => !isOlderThan5Days(b));
  const historyBookings = bookings.filter(b => isOlderThan5Days(b));

  const filtered = activeBookings.filter(b => {
    if (statusFilter === 'All') return true;
    return b.statusName === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : toast.type === 'info'
            ? 'bg-blue-600 text-white'
            : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-70" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Host Operations
            </span>
            <h2 className="text-2xl font-black text-blue-950 tracking-tight">Booking & Reservation Queue</h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Review live tourist booking requests, confirm availability, or decline with feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Real-World Live Sync Status Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-blue-100 shadow-sm text-xs font-semibold text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span>Live Sync</span>
          </div>

          {/* Last Updated Timestamp */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-2 py-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* 5-Day History Archive Icon Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-2 text-xs font-bold border border-blue-200 shadow-sm"
            title="View Past Bookings Archive (> 5 days old)"
          >
            <History className="w-4 h-4 text-blue-600" />
            <span>History Archive</span>
            {historyBookings.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {historyBookings.length}
              </span>
            )}
          </button>

          {/* Manual Refresh Button */}
          <button 
            onClick={() => loadBookings(false)} 
            className="p-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-blue-100 shadow-sm transition-colors flex items-center gap-1.5 text-xs font-bold" 
            title="Manual refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading || isRefreshingSilently ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-blue-100 shadow-sm p-1 rounded-xl w-fit text-xs">
        {['All', 'Pending', 'Confirmed', 'Completed', 'Rejected', 'Expired'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === status ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Main Split Layout: List & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Booking Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-2 text-slate-500 text-xs">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-sm text-slate-700">No active bookings under "{statusFilter}" filter</p>
              <p>Confirmed or completed bookings older than 5 days are archived in the History view.</p>
            </div>
          ) : (
            filtered.map(booking => {
              const isSelected = selectedBooking?.id === booking.id;
              const isPending = booking.statusName === 'Pending';
              const isConfirmed = booking.statusName === 'Confirmed';
              const isCompleted = booking.statusName === 'Completed';
              const isRejected = booking.statusName === 'Rejected';
              const isExpired = booking.statusName === 'Expired';
              const hasWarning = !!booking.hasWarning;

              return (
                <div
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                    hasWarning
                      ? isSelected
                        ? 'border-rose-500 shadow-md ring-2 ring-rose-500/20 bg-rose-50/25'
                        : 'border-rose-300 hover:border-rose-400 bg-rose-50/10 shadow-xs'
                      : isSelected 
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-blue-50/20' 
                        : 'border-blue-100 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-blue-700 font-bold">{booking.bookingReference}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          isPending 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                            : isConfirmed 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isExpired
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {booking.statusName}
                        </span>

                        {/* Top Warning Badge */}
                        {hasWarning && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWarning(booking.warningMessage || 'Be careful about your booking. Approve bookings in right time.');
                            }}
                            className="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors"
                            title="Official Admin Warning Active"
                          >
                            <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
                            <span>Warning Alert</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-blue-950 mt-1.5">{booking.businessName}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{booking.touristName} ({booking.touristEmail})</span>
                      </p>

                      {/* Display Official Admin Warning Callout directly on the card */}
                      {hasWarning && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWarning(booking.warningMessage || 'Be careful about your booking. Approve bookings in right time.');
                          }}
                          className="mt-3 p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100/90 border border-rose-200/90 flex items-start gap-3 transition-colors cursor-pointer group shadow-xs"
                        >
                          <div className="p-1.5 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-extrabold text-rose-950 uppercase tracking-wide">
                                Official Admin Warning for this Booking
                              </span>
                              <span className="text-[10px] font-bold text-rose-700 underline group-hover:text-rose-900 shrink-0">
                                View Notice →
                              </span>
                            </div>
                            <p className="text-xs font-bold text-rose-900 mt-1 leading-snug break-words">
                              "{booking.warningMessage || 'Be careful about your booking. Approve bookings in right time.'}"
                            </p>
                            <p className="text-[10px] text-rose-600 mt-0.5 font-medium">
                              Tourist grievance was reviewed by Admin. Please confirm future bookings promptly.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Display Rejection Reason if present */}
                      {isRejected && booking.cancellationReason && (
                        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2 font-medium">
                          <strong>Rejection Reason:</strong> {booking.cancellationReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-blue-950 font-mono">
                        LKR {booking.totalAmountLkr.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500">{booking.guestsCount} Guests</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Requested: {new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleStatusChange(booking.id, 2, 'Confirmed')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => openRejectModal(booking)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition-all"
                          >
                            Reject / Cancel
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 3, 'Completed')}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {isCompleted && (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Stay Completed</span>
                        </span>
                      )}

                      {isExpired && (
                        <span className="text-xs text-orange-700 font-semibold bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                          Auto-expired after 24h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Booking Audit History & Detail Drawer */}
        <div className="lg:col-span-5">
          {selectedBooking ? (
            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6 sticky top-24">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                  Transactional Audit Record
                </span>
                <h3 className="text-xl font-black text-blue-950 mt-1">{selectedBooking.bookingReference}</h3>
                <p className="text-xs text-slate-600">{selectedBooking.businessName}</p>
              </div>

              {/* Official Administration Warning Notice */}
              {selectedBooking.hasWarning && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200/90 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                        Official Administration Warning
                      </h4>
                      <p className="text-[10px] text-rose-600 font-semibold">Tourist Grievance Disciplinary Notice</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-900 shadow-xs leading-relaxed">
                    "{selectedBooking.warningMessage || 'Be careful about your booking. Approve bookings in right time.'}"
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    This reservation received an official tourist grievance reviewed by TourMate Administration. Please confirm future booking requests on time.
                  </p>
                </div>
              )}

              {/* Reservation Specs */}
              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates:</span>
                  <span className="text-slate-800 font-semibold">
                    {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guests:</span>
                  <span className="text-slate-800 font-semibold">{selectedBooking.guestsCount} Persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Commitment:</span>
                  <span className="text-emerald-700 font-black font-mono">LKR {selectedBooking.totalAmountLkr.toLocaleString()}</span>
                </div>
                {selectedBooking.specialRequests && (
                  <div className="pt-2 border-t border-slate-200 text-slate-600 italic">
                    "{selectedBooking.specialRequests}"
                  </div>
                )}
              </div>

              {/* Status History Audit Log */}
              <div>
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>State Transition History</span>
                </h4>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100 pl-6 max-h-72 overflow-y-auto">
                  {(selectedBooking.statusHistories || []).map((h, i) => (
                    <div key={h.id || i} className="relative text-xs">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                      <p className="font-semibold text-slate-800">{h.reason}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(h.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-blue-100 text-center text-slate-500 text-xs">
              Select a booking to view audit history.
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal with Reason */}
      {rejectModalOpen && bookingToReject && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-blue-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Decline Booking {bookingToReject.bookingReference}</span>
              </h3>
              <button onClick={() => setRejectModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the reason for declining this reservation. This reason will be displayed directly to the tourist on their mobile app:
            </p>

            <form onSubmit={confirmRejection} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Cancellation / Rejection Reason:
                </label>
                <textarea
                  rows="3"
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Fully booked on these dates, private event hosting, maintenance..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-200 transition-all"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-Day History Archive Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-blue-100 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-blue-950">Past Bookings History Archive</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Completed and confirmed reservations older than 5 days are automatically archived here to keep your active operational queue uncluttered.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyBookings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                  No historical bookings older than 5 days found.
                </div>
              ) : (
                historyBookings.map(b => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-800">{b.bookingReference}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {b.statusName}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{b.touristName} • {b.guestsCount} Guests</p>
                      <p className="text-slate-400 text-[11px]">Completed: {new Date(b.updatedAt || b.createdAt).toLocaleDateString()}</p>
                    </div>

                    <p className="font-mono font-bold text-slate-900 text-sm">
                      LKR {b.totalAmountLkr.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Warning Dialog for Business Owner */}
      {selectedWarning && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-amber-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">Official TourMate Warning</h3>
                <p className="text-[11px] text-slate-500">Notice from Platform Administration</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-sm font-semibold leading-relaxed">
              "{selectedWarning}"
            </div>

            <p className="text-xs text-slate-500">
              Please respond promptly to upcoming booking requests within 24 hours to prevent auto-expiration and maintain high guest satisfaction ratings.
            </p>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedWarning(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
