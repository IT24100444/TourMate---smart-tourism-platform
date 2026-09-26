import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, CheckCircle2, XCircle, Clock, Plus, Star,
  ShieldAlert, Eye, Pencil, X, Image as ImageIcon, AlertCircle,
  ChevronRight, RefreshCw, Compass
} from 'lucide-react';
import apiClient from '../../api/client';

// Seeded fallback categories from DB
const DEFAULT_CATEGORIES = [
  { id: '81260054-dfe5-43b2-90c4-26eb73754148', name: 'Adventure & Hiking' },
  { id: 'b3a1ad39-4d60-4ec2-8cb5-c4308c433bdf', name: 'Heritage & Culture' },
  { id: 'd0f0de2c-bb07-4f28-b60a-faf7237137ae', name: 'Nature & Wildlife' },
  { id: 'e1738497-5ede-420a-9ed1-5e8e1de43bf7', name: 'Coastal & Beach' },
];

const DISTRICTS = ['Badulla', 'Matale', 'Galle', 'Kandy', 'Nuwara Eliya', 'Colombo', 'Trincomalee', 'Anuradhapura', 'Polonnaruwa'];

const EMPTY_FORM = {
  name: '',
  district: 'Badulla',
  categoryId: '81260054-dfe5-43b2-90c4-26eb73754148',
  description: '',
  latitude: 6.8768,
  longitude: 81.0608,
  openingHours: '06:00 - 18:00',
  estimatedVisitDurationMinutes: 120,
  entryFeeLkr: 0,
  imageUrls: [''],
};

function StatusBadge({ status }) {
  const cfg = {
    Approved: 'bg-emerald-600/90 text-white',
    PendingReview: 'bg-amber-500/95 text-white animate-pulse',
    Rejected: 'bg-rose-600/90 text-white',
    Draft: 'bg-slate-500/90 text-white',
    Archived: 'bg-gray-500/90 text-white',
  };
  const label = status === 'PendingReview' ? 'Pending Review' : status;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${cfg[status] || 'bg-slate-400 text-white'}`}>
      {label}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-semibold text-sm transition-all animate-in fade-in slide-in-from-bottom-5 ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Place Form (shared for Add & Edit) ───────────────────────────────────────
function PlaceForm({ initial, onSubmit, onClose, title, submitLabel, categories }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setUrl = (i, v) => {
    const arr = [...form.imageUrls];
    arr[i] = v;
    setForm(f => ({ ...f, imageUrls: arr }));
  };
  const addUrl = () => setForm(f => ({ ...f, imageUrls: [...f.imageUrls, ''] }));
  const removeUrl = (i) => setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Attraction name is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    const validUrls = form.imageUrls.filter(u => u.trim());
    setSaving(true);
    try {
      await onSubmit({ ...form, imageUrls: validUrls });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-blue-100 shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-blue-950">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Direct admin published places go live immediately.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Attraction Name *</label>
            <input type="text" required placeholder="e.g. Ravana Ella Waterfall" value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </div>

          {/* District + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">District *</label>
              <select value={form.district} onChange={e => set('district', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Category *</label>
              <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Description *</label>
            <textarea rows="3" placeholder="Captivating overview of the attraction..." value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none" />
          </div>

          {/* Lat / Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Latitude (Sri Lanka)</label>
              <input type="number" step="0.0001" value={form.latitude}
                onChange={e => set('latitude', parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Longitude (Sri Lanka)</label>
              <input type="number" step="0.0001" value={form.longitude}
                onChange={e => set('longitude', parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Opening hours / Duration / Fee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Opening Hours</label>
              <input type="text" placeholder="06:00 - 18:00" value={form.openingHours}
                onChange={e => set('openingHours', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Visit Duration (min)</label>
              <input type="number" min="10" value={form.estimatedVisitDurationMinutes}
                onChange={e => set('estimatedVisitDurationMinutes', parseInt(e.target.value) || 60)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Entry Fee (LKR)</label>
              <input type="number" min="0" value={form.entryFeeLkr}
                onChange={e => set('entryFeeLkr', parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Attraction Photos (Add or change image links)
            </label>
            <div className="space-y-2">
              {form.imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={url}
                    onChange={e => setUrl(i, e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs" />
                  {url && (
                    <img src={url} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  {form.imageUrls.length > 1 && (
                    <button type="button" onClick={() => removeUrl(i)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addUrl}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1">
                <Plus className="w-3.5 h-3.5" /> Add another image URL link
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              💡 Paste direct image URLs (.jpg, .png, or Unsplash/Google URLs). These will be saved to the database.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold shadow-md shadow-blue-200 transition-all">
              {saving ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inspect / View Detail Modal ─────────────────────────────────────────────
function InspectModal({ place, onClose, onApprove, onReject, onEdit, onDelete }) {
  const [actionLoading, setActionLoading] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const images = place.images && place.images.length > 0
    ? place.images
    : ['https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800'];
  const activeImg = images[activeImgIndex] || images[0];

  const act = async (fn, label) => {
    setActionLoading(label);
    try { await fn(); } finally { setActionLoading(''); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-blue-100 shadow-2xl my-4 overflow-hidden">
        {/* Header with Main Image */}
        <div className="relative">
          <img
            src={activeImg}
            alt={place.name}
            className="w-full h-56 object-cover"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/30 to-transparent" />
          <div className="absolute bottom-4 left-6 right-16">
            <StatusBadge status={place.statusName} />
            <h2 className="text-2xl font-black text-white mt-2 leading-tight">{place.name}</h2>
            <p className="text-blue-200 text-xs font-semibold mt-1">
              📍 {place.district} District · <span className="text-blue-300">{place.categoryName}</span>
            </p>
          </div>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gallery Thumbnails (if multiple images) */}
        {images.length > 1 && (
          <div className="flex gap-2 px-6 pt-3 pb-1 bg-slate-50 border-b border-slate-100 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImgIndex(i)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                  activeImgIndex === i ? 'ring-2 ring-blue-600 scale-105' : 'opacity-70 hover:opacity-100'
                }`}>
                <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              </button>
            ))}
          </div>
        )}

        {/* Details Grid */}
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">About this place</p>
              <p className="text-slate-800 text-xs leading-relaxed">{place.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Added on: {new Date(place.createdAt).toLocaleDateString()}</span>
              <span className="font-semibold text-blue-600">{images.length} photo{images.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 flex justify-between items-center">
              <span className="text-xs text-slate-600 font-semibold">Entry Fee</span>
              <span className="font-bold text-blue-950 text-sm">
                {place.entryFeeLkr === 0 ? 'Free' : `LKR ${Number(place.entryFeeLkr).toLocaleString()}`}
              </span>
            </div>
            <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 flex justify-between items-center">
              <span className="text-xs text-slate-600 font-semibold">Estimated Visit</span>
              <span className="font-bold text-blue-950 text-sm">{place.estimatedVisitDurationMinutes} mins</span>
            </div>
            <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 flex justify-between items-center">
              <span className="text-xs text-slate-600 font-semibold">Opening Hours</span>
              <span className="font-bold text-blue-950 text-xs">{place.openingHours || '06:00 - 18:00'}</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex justify-between items-center">
              <span className="text-xs text-slate-600 font-semibold">Rating</span>
              <span className="font-bold text-amber-700 text-sm flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {place.averageRating} ({place.reviewCount} reviews)
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">Coordinates (GPS)</span>
              <span className="font-mono text-xs text-slate-700">{place.latitude?.toFixed(4)}, {place.longitude?.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          {showRejectInput && (
            <div className="space-y-2 p-3 bg-rose-50 rounded-2xl border border-rose-200">
              <p className="text-xs font-bold text-rose-800">Reason for Rejection</p>
              <textarea rows="2" placeholder="e.g. Inaccurate coordinates or insufficient safety details..." value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-900 text-xs focus:outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowRejectInput(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white">
                  Cancel
                </button>
                <button onClick={() => act(() => onReject(place.id, rejectComment), 'reject')} disabled={!!actionLoading}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-60">
                  {actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}

          {/* Pending Review actions: Approve or Reject */}
          {place.statusName === 'PendingReview' && !showRejectInput && (
            <div className="flex gap-2">
              <button onClick={() => act(() => onApprove(place.id), 'approve')} disabled={!!actionLoading}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all disabled:opacity-60">
                <CheckCircle2 className="w-5 h-5" />
                {actionLoading === 'approve' ? 'Approving...' : 'Approve & Publish to Front'}
              </button>
              <button onClick={() => setShowRejectInput(true)}
                className="py-3 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-sm font-bold flex items-center justify-center gap-2 transition-all">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}

          {/* Edit / Delete actions */}
          <div className="flex gap-2">
            <button onClick={onEdit}
              className="flex-1 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition-all">
              <Pencil className="w-4 h-4" /> Edit Details & Images
            </button>
            <button onClick={() => act(() => onDelete(place.id), 'delete')} disabled={!!actionLoading}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              <Trash2 className="w-4 h-4" />
              {actionLoading === 'delete' ? 'Archiving...' : 'Archive Place'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlacesManager() {
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' | 'pending'
  const [places, setPlaces] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [inspectPlace, setInspectPlace] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Load categories dynamically from backend ──
  useEffect(() => {
    apiClient.get('/tourism-places/categories')
      .then(res => {
        const list = res.data?.data || [];
        if (list.length > 0) setCategories(list);
      })
      .catch(() => {});
  }, []);

  // ── Fetch places from API ──
  const loadPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/tourism-places');
      const allPlaces = res.data?.data || res.data?.items || [];
      setPlaces(allPlaces);
    } catch (err) {
      showToast('Failed to load places from server.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  // ── Derived lists (no filtering, just status split) ──
  const approvedPlaces = places.filter(p => p.statusName === 'Approved');
  const pendingPlaces = places.filter(p => p.statusName === 'PendingReview');

  // ── CRUD handlers ──
  const handleAdd = async (formData) => {
    const payload = {
      categoryId: formData.categoryId,
      name: formData.name,
      district: formData.district,
      description: formData.description,
      latitude: formData.latitude,
      longitude: formData.longitude,
      openingHours: formData.openingHours,
      estimatedVisitDurationMinutes: formData.estimatedVisitDurationMinutes,
      entryFeeLkr: formData.entryFeeLkr,
      imageUrls: formData.imageUrls.filter(u => u.trim()),
    };
    await apiClient.post('/tourism-places', payload);
    showToast('Attraction created and is now live! ✅');
    setShowAddModal(false);
    setActiveTab('approved');
    await loadPlaces();
  };

  const handleEdit = async (formData) => {
    const payload = {
      categoryId: formData.categoryId,
      name: formData.name,
      district: formData.district,
      description: formData.description,
      latitude: formData.latitude,
      longitude: formData.longitude,
      openingHours: formData.openingHours,
      estimatedVisitDurationMinutes: formData.estimatedVisitDurationMinutes,
      entryFeeLkr: formData.entryFeeLkr,
      imageUrls: formData.imageUrls.filter(u => u.trim()),
    };
    await apiClient.put(`/tourism-places/${editingPlace.id}`, payload);
    showToast('Place details and images updated successfully! ✅');
    setEditingPlace(null);
    setInspectPlace(null);
    await loadPlaces();
  };

  const handleApprove = async (id) => {
    await apiClient.post(`/tourism-places/${id}/approve`, { decision: 1, comments: 'Approved by admin.' });
    showToast('Place approved and is now live on the front page! ✅');
    setInspectPlace(null);
    setActiveTab('approved');
    await loadPlaces();
  };

  const handleReject = async (id, comments) => {
    await apiClient.post(`/tourism-places/${id}/approve`, { decision: 2, comments: comments || 'Rejected by admin.' });
    showToast('Tourist submission rejected.', 'error');
    setInspectPlace(null);
    await loadPlaces();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this place? It will be removed from public discovery.')) return;
    await apiClient.delete(`/tourism-places/${id}`);
    showToast('Place archived successfully.');
    setInspectPlace(null);
    await loadPlaces();
  };

  // Convert place to form initial values for editing
  const placeToForm = (place) => ({
    name: place.name || '',
    district: place.district || 'Badulla',
    categoryId: place.categoryId || categories[0]?.id || DEFAULT_CATEGORIES[0].id,
    description: place.description || '',
    latitude: place.latitude || 6.8768,
    longitude: place.longitude || 81.0608,
    openingHours: place.openingHours || '06:00 - 18:00',
    estimatedVisitDurationMinutes: place.estimatedVisitDurationMinutes || 120,
    entryFeeLkr: place.entryFeeLkr || 0,
    imageUrls: place.images?.length ? [...place.images] : [''],
  });

  const PlaceCard = ({ place }) => (
    <div className="bg-white rounded-2xl overflow-hidden border border-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md transition-all group flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img
          src={place.images?.[0] || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800'}
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800'; }}
        />
        <div className="absolute top-3 left-3"><StatusBadge status={place.statusName} /></div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 shadow-sm border border-amber-200/50 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{place.averageRating}</span>
          <span className="text-slate-400 font-normal">({place.reviewCount})</span>
        </div>
        {place.images && place.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-blue-950/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            <span>{place.images.length} photos</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{place.district}</span>
            <span>·</span>
            <span className="text-slate-600">{place.categoryName}</span>
          </div>
          <h3 className="text-base font-bold text-blue-950 group-hover:text-blue-600 transition-colors leading-snug">{place.name}</h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{place.description}</p>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{place.estimatedVisitDurationMinutes} mins</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Entry: </span>
            <span className="font-bold text-slate-900">{place.entryFeeLkr === 0 ? 'Free' : `LKR ${Number(place.entryFeeLkr).toLocaleString()}`}</span>
          </div>
        </div>

        {/* Actions */}
        {place.statusName === 'PendingReview' ? (
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => handleApprove(place.id)}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all">
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
            <button onClick={() => setInspectPlace(place)}
              className="py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center transition-all"
              title="Inspect Details">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => handleReject(place.id, '')}
              className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center transition-all"
              title="Reject">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1 text-xs">
            <button onClick={() => setEditingPlace(place)}
              className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-semibold transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setInspectPlace(place)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors">
              Inspect Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Tourism Places
            </span>
            <h2 className="text-2xl font-black text-blue-950 tracking-tight">Tourism Place Discovery & Moderation</h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Publish verified Sri Lankan destinations, manage GPS coordinates, and review tourist exploration submissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPlaces}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Add Attraction
          </button>
        </div>
      </div>

      {/* Pending tourist alert banner */}
      {pendingPlaces.length > 0 && activeTab !== 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {pendingPlaces.length} Tourist Explored Place{pendingPlaces.length > 1 ? 's' : ''} Awaiting Admin Moderation
              </h4>
              <p className="text-xs text-amber-700">These places are kept separate until you inspect and approve them.</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('pending')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5">
            Review Queue ({pendingPlaces.length}) →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {[
          { key: 'approved', label: 'Approved Attractions (Front List)', count: approvedPlaces.length },
          { key: 'pending', label: 'Pending Tourist Submissions', count: pendingPlaces.length, alert: pendingPlaces.length > 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === tab.key
                ? (tab.alert ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-700')
                : 'bg-slate-200 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Approved Tab (Main Front List) */}
          {activeTab === 'approved' && (
            approvedPlaces.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-blue-100 p-8">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-blue-400 opacity-60" />
                <p className="font-bold text-slate-700 text-base">No approved attractions found.</p>
                <p className="text-xs text-slate-500 mt-1">Click <strong>Add Attraction</strong> above to add your first destination.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedPlaces.map(place => <PlaceCard key={place.id} place={place} />)}
              </div>
            )
          )}

          {/* Pending Review Tab (Tourist Explored Places) */}
          {activeTab === 'pending' && (
            pendingPlaces.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-blue-100 p-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                <p className="font-bold text-slate-700 text-base">No pending submissions!</p>
                <p className="text-xs text-slate-500 mt-1">When tourists submit newly discovered places through the mobile app, they will appear here for your moderation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPlaces.map(place => <PlaceCard key={place.id} place={place} />)}
              </div>
            )
          )}
        </>
      )}

      {/* Modals */}
      {showAddModal && (
        <PlaceForm
          initial={EMPTY_FORM}
          title="Register New Tourism Attraction"
          submitLabel="Publish Attraction"
          categories={categories}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingPlace && (
        <PlaceForm
          initial={placeToForm(editingPlace)}
          title={`Edit: ${editingPlace.name}`}
          submitLabel="Save Changes"
          categories={categories}
          onSubmit={handleEdit}
          onClose={() => setEditingPlace(null)}
        />
      )}

      {inspectPlace && !editingPlace && (
        <InspectModal
          place={inspectPlace}
          onClose={() => setInspectPlace(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={() => { setEditingPlace(inspectPlace); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
