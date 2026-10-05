import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Heart,
  MessageSquare,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Calendar,
  X,
  Edit3,
  CornerDownRight,
  Lock
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export default function BookingReviews() {
  const { role, user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needs-reply' | 'replied' | 'hearted' | 'removed'
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Reply state: { [reviewId]: string }
  const [replyInputs, setReplyInputs] = useState({});
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  // Delete modal state
  const [deletingReview, setDeletingReview] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reviews/owner');
      const items = res.data?.data || res.data || [];
      setReviews(Array.isArray(items) ? items : []);
    } catch {
      setReviews((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Unique property names for filtering
  const propertyNames = Array.from(new Set(reviews.map(r => r.businessName).filter(Boolean)));

  // Heart Reaction Toggle (YouTube style Creator Heart)
  const handleToggleHeart = async (review) => {
    const nextHeartState = !review.isHeartedByOwner;
    // Optimistic UI update
    setReviews(prev => prev.map(r =>
      r.id === review.id ? { ...r, isHeartedByOwner: nextHeartState, ownerHeartedAt: nextHeartState ? new Date().toISOString() : null } : r
    ));

    try {
      await apiClient.post(`/reviews/${review.id}/react`, { isHearted: nextHeartState });
      showToast(nextHeartState ? 'Loved by Host ❤️' : 'Heart reaction removed.');
    } catch {
      // Revert on error
      setReviews(prev => prev.map(r =>
        r.id === review.id ? { ...r, isHeartedByOwner: !nextHeartState } : r
      ));
      showToast('Failed to update heart reaction.', 'error');
    }
  };

  // Submit Host Reply
  const handleSendReply = async (reviewId) => {
    const text = (replyInputs[reviewId] || '').trim();
    if (!text) return;

    setSubmittingReplyId(reviewId);
    try {
      const res = await apiClient.post(`/reviews/${reviewId}/reply`, { reply: text });
      const updated = res.data?.data;

      setReviews(prev => prev.map(r =>
        r.id === reviewId ? {
          ...r,
          ownerReply: updated?.ownerReply || text,
          ownerRepliedAt: updated?.ownerRepliedAt || new Date().toISOString()
        } : r
      ));

      setEditingReplyId(null);
      setReplyInputs(prev => ({ ...prev, [reviewId]: '' }));
      showToast('Official host reply published! 💬');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit reply.', 'error');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Delete Host Reply
  const handleDeleteReply = async (reviewId) => {
    try {
      await apiClient.delete(`/reviews/${reviewId}/reply`);
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, ownerReply: null, ownerRepliedAt: null } : r
      ));
      setEditingReplyId(null);
      showToast('Reply removed successfully.');
    } catch {
      showToast('Failed to remove reply.', 'error');
    }
  };

  // Business Owner Deletes Tourist Review
  const handleConfirmDeleteReview = async () => {
    if (!deletingReview) return;
    if (deletingReview.ownerReply || deletingReview.isHeartedByOwner) {
      showToast('Cannot delete review after replying or giving a heart reaction.', 'error');
      setDeletingReview(null);
      return;
    }
    setDeletingLoading(true);

    try {
      await apiClient.delete(`/reviews/${deletingReview.id}/owner`);
      setReviews(prev => prev.map(r =>
        r.id === deletingReview.id ? { ...r, isDeletedByOwner: true, ownerReply: null, isHeartedByOwner: false } : r
      ));
      showToast('Tourist review removed from public listings.');
      setDeletingReview(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove review.', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (propertyFilter !== 'all' && r.businessName !== propertyFilter) {
      return false;
    }
    if (activeFilter === 'needs-reply') return !r.ownerReply && !r.isDeletedByOwner;
    if (activeFilter === 'replied') return !!r.ownerReply && !r.isDeletedByOwner;
    if (activeFilter === 'hearted') return r.isHeartedByOwner && !r.isDeletedByOwner;
    if (activeFilter === 'removed') return r.isDeletedByOwner;
    return true;
  });

  if (role !== 'BusinessOwner') {
    return (
      <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-blue-950">Business Owner Access Only</h3>
        <p className="text-xs text-slate-500">Only verified property hosts and business owners can view and manage post-stay booking reviews.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm text-white ${
            toast.type === 'error' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-emerald-600 shadow-emerald-600/30'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Host Reputation Management</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Signed in as: <strong className="text-slate-800">{user?.fullName || user?.email}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-black text-blue-950 tracking-tight">
            Post-Stay Booking Reviews
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Read verified guest reviews submitted exclusively following completed stays. React with a creator heart (❤️), publish host replies, and moderate property reputation.
          </p>
        </div>

        <button
          onClick={loadReviews}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2 text-xs font-bold self-start lg:self-auto"
          title="Refresh Reviews"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Property Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Reviews', count: reviews.length },
            { id: 'needs-reply', label: 'Needs Reply', count: reviews.filter(r => !r.ownerReply && !r.isDeletedByOwner).length },
            { id: 'replied', label: 'Replied', count: reviews.filter(r => !!r.ownerReply && !r.isDeletedByOwner).length },
            { id: 'hearted', label: 'Loved ❤️', count: reviews.filter(r => r.isHeartedByOwner && !r.isDeletedByOwner).length },
            { id: 'removed', label: 'Removed by You', count: reviews.filter(r => r.isDeletedByOwner).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeFilter === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {propertyNames.length > 1 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Building2 className="w-4 h-4 text-blue-600" />
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Properties ({propertyNames.length})</option>
              {propertyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading verified guest reviews…</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-blue-100 text-center space-y-3 shadow-sm">
            <Star className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-blue-950">No Reviews Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeFilter === 'needs-reply'
                ? 'All guest reviews currently have an official host response!'
                : 'No reviews match your selected filter. When tourists complete their stay, their reviews will appear here.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((r) => {
            const isEditingThisReply = editingReplyId === r.id;
            const isSubmittingThisReply = submittingReplyId === r.id;
            const isRemoved = r.isDeletedByOwner;

            return (
              <div
                key={r.id}
                className={`p-6 rounded-3xl bg-white border transition-all space-y-4 shadow-sm ${
                  isRemoved
                    ? 'border-red-200 bg-rose-50/20 opacity-75'
                    : 'border-blue-100 hover:border-blue-300'
                }`}
              >
                {/* Review Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Business Name Badge */}
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      {r.businessName || 'Property Listing'}
                    </span>

                    {/* Booking Reference */}
                    {r.bookingReference && (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                        {r.bookingReference}
                      </span>
                    )}

                    {/* Deletion state */}
                    {isRemoved && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                        Deleted by You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {/* Tourist & Rating Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                      {r.touristName ? r.touristName.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-blue-950 flex items-center gap-1.5">
                        <span>{r.touristName || 'Verified Tourist'}</span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                          Verified Stay
                        </span>
                      </h4>
                      {/* Star Rating display */}
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

                  {/* Actions (Heart & Delete) */}
                  {!isRemoved && (
                    <div className="flex items-center gap-2">
                      {/* YouTube Creator Heart Button */}
                      <button
                        onClick={() => handleToggleHeart(r)}
                        className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                          r.isHeartedByOwner
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-rose-500 hover:bg-rose-50'
                        }`}
                        title={r.isHeartedByOwner ? 'Remove Heart' : 'Give Host Heart'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            r.isHeartedByOwner ? 'fill-rose-500 text-rose-500 animate-pulse' : ''
                          }`}
                        />
                        <span className="hidden sm:inline">
                          {r.isHeartedByOwner ? 'Loved' : 'Give Heart'}
                        </span>
                      </button>

                      {/* Owner Delete Review Button (Only before reply/reaction) */}
                      {r.ownerReply || r.isHeartedByOwner ? (
                        <div
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 cursor-not-allowed"
                          title="Locked: You cannot delete a guest review once you have replied or reacted to it."
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Delete Locked</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingReview(r)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                          title="Delete this guest review (Only available before replying or reacting)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Review Comment Text */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  "{r.comment}"
                </div>

                {/* Host Heart Badge Indicator (if hearted) */}
                {r.isHeartedByOwner && !isRemoved && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    <span>Loved by Property Host</span>
                    {r.ownerHeartedAt && (
                      <span className="text-[10px] text-rose-400 font-normal ml-1">
                        • {new Date(r.ownerHeartedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Host Reply Section */}
                {!isRemoved && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    {r.ownerReply && !isEditingThisReply ? (
                      /* Existing Published Reply */
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                            <CornerDownRight className="w-4 h-4 text-blue-600" />
                            <span>Official Host Response:</span>
                            {r.ownerRepliedAt && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({new Date(r.ownerRepliedAt).toLocaleString()})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingReplyId(r.id);
                                setReplyInputs(prev => ({ ...prev, [r.id]: r.ownerReply }));
                              }}
                              className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteReply(r.id)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed pl-6">
                          "{r.ownerReply}"
                        </p>
                      </div>
                    ) : isEditingThisReply ? (
                      /* Editing Existing Reply */
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                          <span className="flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-blue-600" />
                            Edit Your Host Reply
                          </span>
                          <button
                            onClick={() => setEditingReplyId(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          rows="3"
                          value={replyInputs[r.id] ?? r.ownerReply ?? ''}
                          onChange={(e) => setReplyInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Update your response to this guest..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-blue-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingReplyId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSendReply(r.id)}
                            disabled={isSubmittingThisReply}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-200 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmittingThisReply ? 'Saving…' : 'Save Changes'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* No Reply Yet: Expandable Input */
                      <div>
                        {replyInputs[r.id] !== undefined && replyInputs[r.id] !== null ? (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                Write Public Response to Guest
                              </span>
                              <button
                                onClick={() => setReplyInputs(prev => ({ ...prev, [r.id]: undefined }))}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              rows="3"
                              value={replyInputs[r.id] || ''}
                              onChange={(e) => setReplyInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="Thank the guest for staying, address their points, or share future amenities..."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setReplyInputs(prev => ({ ...prev, [r.id]: undefined }))}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSendReply(r.id)}
                                disabled={isSubmittingThisReply || !((replyInputs[r.id] || '').trim())}
                                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-200 disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmittingThisReply ? 'Sending…' : 'Publish Reply'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyInputs(prev => ({ ...prev, [r.id]: '' }))}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Reply to this guest</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Review Confirmation Modal */}
      {deletingReview && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-blue-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-blue-950">Remove Guest Review?</h3>
              </div>
              <button onClick={() => setDeletingReview(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this review by <strong className="text-blue-950 font-bold">{deletingReview.touristName}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed space-y-1">
              <p><strong>Notice:</strong> This review will be taken down from your public listings. On the tourist's mobile app, they will see a notification stating: <em>"Business owner deleted your review"</em>.</p>
              <p className="text-[11px] text-amber-800 font-semibold">ℹ️ Rule: Deleting is permitted only because you have not replied or reacted to this review yet.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReview}
                disabled={deletingLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingLoading ? 'Removing…' : 'Confirm & Remove Review'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
