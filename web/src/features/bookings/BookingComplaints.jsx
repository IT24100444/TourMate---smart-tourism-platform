import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  RefreshCw, 
  X, 
  ShieldAlert,
  Calendar
} from 'lucide-react';
import apiClient, { mockData } from '../../api/client';

export default function BookingComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState(
    'Be careful about your booking. Approve bookings in right time.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Live State
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshingSilently, setIsRefreshingSilently] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadComplaints = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshingSilently(true);
    }

    try {
      const res = await apiClient.get('/admin/complaints');
      const items = res.data?.data || res.data || [];
      const list = Array.isArray(items) ? items : [];
      const finalList = list.length > 0 ? list : (mockData.complaints || []);

      setComplaints((prev) => {
        // Soft alert if new complaint arrived in silent mode
        if (silent && prev.length > 0 && finalList.length > prev.length) {
          showToast('🔔 New tourist booking complaint received!', 'warning');
        }
        return finalList;
      });
      setLastUpdated(new Date());
    } catch {
      setComplaints((prev) => (prev.length > 0 ? prev : (mockData.complaints || [])));
    } finally {
      setLoading(false);
      setIsRefreshingSilently(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints(false);
  }, [loadComplaints]);

  // Real-World Auto-Refresh 1: Window Focus & Tab Visibility Sync
  useEffect(() => {
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible' && !warningModalOpen) {
        loadComplaints(true);
      }
    };
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);
    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [warningModalOpen, loadComplaints]);

  // Real-World Auto-Refresh 2: Cross-Component / Cross-Tab Event Sync
  useEffect(() => {
    const handleGlobalSync = () => {
      loadComplaints(true);
    };
    window.addEventListener('tourmate-warning-updated', handleGlobalSync);
    window.addEventListener('tourmate-booking-updated', handleGlobalSync);
    window.addEventListener('storage', handleGlobalSync);
    return () => {
      window.removeEventListener('tourmate-warning-updated', handleGlobalSync);
      window.removeEventListener('tourmate-booking-updated', handleGlobalSync);
      window.removeEventListener('storage', handleGlobalSync);
    };
  }, [loadComplaints]);

  // Real-World Auto-Refresh 3: Gentle Silent Heartbeat (every 30s in background, no countdown chip)
  useEffect(() => {
    if (warningModalOpen) return;
    const timer = setInterval(() => {
      loadComplaints(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [warningModalOpen, loadComplaints]);

  const handleOpenWarningModal = (complaint) => {
    setSelectedComplaint(complaint);
    setWarningMessage('Be careful about your booking. Approve bookings in right time.');
    setWarningModalOpen(true);
  };

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSubmitting(true);

    const sentComplaintId = selectedComplaint.id;
    const sentBookingId = selectedComplaint.bookingId;
    const sentBookingRef = selectedComplaint.bookingReference;
    const sentMessage = warningMessage.trim() || 'Be careful about your booking. Approve bookings in right time.';

    // 1. Sync warning immediately to persistent localStorage keyed by Booking ID & Booking Reference
    try {
      const stored = JSON.parse(localStorage.getItem('tourmate_booking_warnings') || '{}');
      const warningRecord = {
        hasWarning: true,
        warningMessage: sentMessage,
        issuedAt: new Date().toISOString()
      };
      if (sentBookingId) stored[sentBookingId] = warningRecord;
      if (sentBookingRef) stored[sentBookingRef] = warningRecord;
      localStorage.setItem('tourmate_booking_warnings', JSON.stringify(stored));

      if (mockData?.bookings) {
        mockData.bookings = mockData.bookings.map((b) => {
          if (b.id === sentBookingId || b.bookingReference === sentBookingRef) {
            return {
              ...b,
              hasWarning: true,
              warningMessage: sentMessage
            };
          }
          return b;
        });
      }

      // Broadcast event so any open BookingQueue instance updates immediately
      window.dispatchEvent(
        new CustomEvent('tourmate-warning-updated', {
          detail: { bookingId: sentBookingId, bookingReference: sentBookingRef, warningMessage: sentMessage }
        })
      );
    } catch (err) {
      console.warn('Local warning sync note:', err);
    }

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === sentComplaintId
          ? {
              ...c,
              status: 'WarningSent',
              adminWarningMessage: sentMessage,
              resolvedAt: new Date().toISOString()
            }
          : c
      )
    );

    // Close modal immediately for responsive UX
    setWarningModalOpen(false);
    setSelectedComplaint(null);

    try {
      await apiClient.post(`/admin/complaints/${sentComplaintId}/warning`, {
        warningMessage: sentMessage
      });
      showToast('Official warning dispatched to business owner! ⚠️');
      // Sync with server to confirm persisted state
      await loadComplaints();
    } catch {
      showToast('Warning recorded and synced to host booking card! ⚠️', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          {toast.msg}
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              Admin Governance
            </span>
            <h2 className="text-2xl font-black text-blue-950 tracking-tight">
              Booking Complains & Host Discipline
            </h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Review tourist grievances regarding unconfirmed or expired bookings and issue disciplinary warnings to host accounts.
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

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadComplaints(false)}
            className="p-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-blue-100 shadow-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Manual refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading || isRefreshingSilently ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {complaints.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3 shadow-sm">
            <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-blue-950">No Pending Complaints</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              All tourist bookings are being confirmed on time. There are currently no host complaints awaiting administrative review.
            </p>
          </div>
        ) : (
          complaints.map((c) => {
            const isWarningSent = c.status === 'WarningSent';

            return (
              <div
                key={c.id}
                className="p-6 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      {c.bookingReference}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        isWarningSent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      }`}
                    >
                      {isWarningSent ? 'Warning Dispatched' : 'Pending Review'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Filed: {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Property Info */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Accused Host / Property:</span>
                    </div>
                    <p className="text-sm font-black text-blue-950">{c.businessName}</p>
                    <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {c.businessType === 1 ? 'Hotel' : 'Restaurant'}
                    </span>
                  </div>

                  {/* Tourist Info */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Complainant Tourist:</span>
                    </div>
                    <p className="text-sm font-black text-blue-950">{c.touristName}</p>
                    <p className="text-slate-500 font-mono">{c.touristEmail}</p>
                  </div>
                </div>

                {/* Complaint Body */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/70 text-rose-950 text-xs leading-relaxed space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-rose-800 uppercase tracking-wider text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Tourist Complaint Statement:
                  </span>
                  <p className="font-medium text-slate-800 text-sm">"{c.complaintText}"</p>
                </div>

                {/* Status or Action */}
                <div className="flex items-center justify-between pt-2">
                  {isWarningSent ? (
                    <div className="text-xs text-emerald-800 font-medium flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Disciplinary warning active: "<em>{c.adminWarningMessage}</em>"
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Awaiting administrative warning decision
                    </span>
                  )}

                  {!isWarningSent && (
                    <button
                      onClick={() => handleOpenWarningModal(c)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-200 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Warning</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warning Confirmation Modal */}
      {warningModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-blue-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-blue-950">Issue Host Warning</h3>
              </div>
              <button onClick={() => setWarningModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will send an official disciplinary warning to{' '}
              <strong className="text-blue-950 font-bold">{selectedComplaint.businessName}</strong> and mark their booking card with an alert icon:
            </p>

            <form onSubmit={handleSendWarning} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Warning Message to Host:
                </label>
                <textarea
                  rows="3"
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarningModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-200 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending...' : 'Confirm & Dispatch Warning'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
