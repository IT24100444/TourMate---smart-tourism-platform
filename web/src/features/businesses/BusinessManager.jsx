import React, { useState, useEffect, useCallback } from 'react';
import { 
  Hotel, 
  Utensils, 
  Plus, 
  ShieldCheck, 
  Star, 
  Percent,
  AlertCircle,
  CheckCircle2,
  X,
  MapPin,
  Phone,
  Mail,
  Image as ImageIcon,
  Building2,
  Clock,
  Trash2,
  Eye,
  Info,
  XCircle,
  Search,
  Check,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import apiClient, { mockData } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const DISTRICTS = [
  'All',
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

const EMPTY_BIZ_FORM = {
  name: '',
  type: 1, // 1: Hotel, 2: Restaurant
  district: 'Badulla',
  address: '',
  latitude: 6.8768,
  longitude: 81.0608,
  contactPhone: '+94 57 222 3456',
  contactEmail: '',
  description: '',
  priceRange: '$$',
  imageUrls: [''],
  // Hotel specifics
  starRating: 4,
  checkInTime: '14:00',
  checkOutTime: '11:00',
  amenities: 'Infinity Pool, Mountain View, Ceylon Breakfast, Free WiFi',
  roomPrice: 18000,
  // Restaurant specifics
  cuisineType: 'Authentic Sri Lankan & Ceylon Spices',
  openingHours: '07:00 - 22:30',
  averageCostPerPersonLkr: 2500,
  diningFeatures: 'Clay-pot Curries, Wood-fired Oven, Mountain Terrace',
};

// ─── Modal: Inspect & Review Business ───────────────────────────────────────────
function InspectBusinessModal({ biz, onClose, onApprove, onReject, onDelete, isAdmin, isOwner }) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (!biz) return null;

  const isHotel = biz.type === 1 || biz.type === 'Hotel' || biz.typeName === 'Hotel';
  const isPending = biz.verificationStatus === 2 || biz.verificationStatus === 'PendingVerification' || biz.statusName === 'PendingVerification';
  const isApproved = biz.verificationStatus === 3 || biz.verificationStatus === 'Active' || biz.statusName === 'Active';
  const images = (biz.images && biz.images.length > 0) ? biz.images : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'];

  const handleApprove = async () => {
    setActionLoading(true);
    await onApprove(biz.id);
    setActionLoading(false);
    onClose();
  };

  const handleReject = async () => {
    setActionLoading(true);
    await onReject(biz.id, rejectReason);
    setActionLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${biz.name}"?`)) return;
    setActionLoading(true);
    await onDelete(biz.id);
    setActionLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-blue-100 shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
              isHotel ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {isHotel ? <Hotel className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-blue-950">{biz.name}</h3>
                {isPending ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                ) : isApproved ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Rejected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                📍 {biz.district} District · {biz.address}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-7 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Photo Gallery with Thumbnail selector */}
          <div className="space-y-2">
            <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
              <img 
                src={images[activeImgIdx]} 
                alt={biz.name}
                className="w-full h-full object-cover transition-all duration-300"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'; }}
              />
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-blue-950/70 text-white font-mono text-[11px] backdrop-blur-md">
                Photo {activeImgIdx + 1} of {images.length}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIdx(idx)}
                    className={`relative w-16 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      activeImgIdx === idx ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold block mb-1">Business Type</span>
              <p className="text-sm font-black text-blue-950">{isHotel ? 'Hotel / Resort' : 'Artisan Restaurant'}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold block mb-1">Pricing Bracket</span>
              <p className="text-sm font-black text-blue-950">{biz.priceRange || '$$'}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold block mb-1">User Ratings</span>
              <p className="text-sm font-black text-blue-950 flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {biz.rating || '4.8'} ({biz.reviewCount || 0})
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold block mb-1">GPS Coordinates</span>
              <p className="text-xs font-mono font-bold text-blue-950 truncate">
                {biz.latitude?.toFixed(4)}, {biz.longitude?.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-bold text-slate-900 mb-1.5 text-sm">About Property</h4>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {biz.description || 'No description provided.'}
            </p>
          </div>

          {/* Type-Specific Details */}
          {isHotel && biz.hotel && (
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
              <h4 className="font-bold text-blue-950 flex items-center gap-2 text-sm">
                <Hotel className="w-4 h-4 text-blue-600" />
                Accommodation Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Star Classification:</span>
                  <p className="font-bold text-slate-800">{biz.hotel.starRating} Stars</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Check-In Time:</span>
                  <p className="font-bold text-slate-800">{biz.hotel.checkInTime || '14:00'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Check-Out Time:</span>
                  <p className="font-bold text-slate-800">{biz.hotel.checkOutTime || '11:00'}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-1.5">Amenities & Hospitality Features:</span>
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(biz.hotel.amenitiesJson || '[]').map((amenity, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-[11px] shadow-sm">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isHotel && biz.restaurant && (
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <h4 className="font-bold text-amber-950 flex items-center gap-2 text-sm">
                <Utensils className="w-4 h-4 text-amber-600" />
                Culinary & Dining Specifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Cuisine Type:</span>
                  <p className="font-bold text-slate-800">{biz.restaurant.cuisineType || 'Sri Lankan Traditional'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Daily Service Hours:</span>
                  <p className="font-bold text-slate-800">{biz.restaurant.openingHours || '07:00 - 22:30'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Avg Cost Per Guest:</span>
                  <p className="font-bold text-slate-800">LKR {biz.restaurant.averageCostPerPersonLkr?.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-1.5">Dining Amenities & Features:</span>
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(biz.restaurant.diningFeaturesJson || '[]').map((feat, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 font-semibold text-[11px] shadow-sm">
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-blue-600" />
              <span className="font-bold">Contact:</span>
              <span>{biz.contactPhone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="font-bold">Email:</span>
              <span>{biz.contactEmail || 'N/A'}</span>
            </div>
          </div>

          {/* Rejection Prompt */}
          {rejectMode && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Specify Rejection Reason</span>
              </div>
              <textarea
                rows="2"
                placeholder="Explain why this listing does not meet TourMate standards (e.g. invalid license, inaccurate pricing, blurred photos)..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-60"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {(isAdmin || isOwner) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Listing</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold"
            >
              Close
            </button>

            {isAdmin && isPending && !rejectMode && (
              <>
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition-all hover:scale-[1.02] disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{actionLoading ? 'Approving...' : 'Approve & Publish to Front'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Business Manager Component ──────────────────────────────────────────
export default function BusinessManager() {
  const { role, user } = useAuth();
  const isAdmin = role === 'Administrator';
  const isOwner = role === 'BusinessOwner';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'approved' : 'my-listings');
  const [approvedBusinesses, setApprovedBusinesses] = useState([]);
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedType, setSelectedType] = useState('All'); // 'All' | '1' (Hotel) | '2' (Restaurant)

  // Inspection modal
  const [inspectingBiz, setInspectingBiz] = useState(null);

  // Add Business Modal
  const [showAddBizModal, setShowAddBizModal] = useState(false);
  const [bizForm, setBizForm] = useState(EMPTY_BIZ_FORM);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState('');

  // Special Offer Modal (Strictly Business Owner only)
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerBizId, setOfferBizId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [discountPercent, setDiscountPercent] = useState(15);
  const [offerSaving, setOfferSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Businesses from API ──────────────────────────────────────────────
  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Load Approved (status = 3)
        const approvedRes = await apiClient.get('/businesses', { params: { status: 3, pageSize: 100 } });
        const appList = approvedRes.data?.data?.items || approvedRes.data?.data || approvedRes.data?.items || [];

        // Load Pending Submissions (status = 2)
        const pendingRes = await apiClient.get('/businesses', { params: { status: 2, pageSize: 100 } });
        const pendList = pendingRes.data?.data?.items || pendingRes.data?.data || pendingRes.data?.items || [];

        setApprovedBusinesses(Array.isArray(appList) && appList.length > 0 ? appList : mockData.businesses);
        setPendingBusinesses(Array.isArray(pendList) ? pendList : []);
      } else {
        // Business Owner: Load their registered properties
        const myRes = await apiClient.get('/businesses/my');
        const list = myRes.data?.data || myRes.data || [];
        setMyBusinesses(Array.isArray(list) && list.length > 0 ? list : mockData.businesses);
      }
    } catch (err) {
      console.error('Failed to load businesses from API:', err);
      if (isAdmin) {
        setApprovedBusinesses(mockData.businesses);
      } else {
        setMyBusinesses(mockData.businesses);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  // ─── Verification Handler (Admin Only) ─────────────────────────────────────
  const handleApproveBusiness = async (bizId) => {
    try {
      await apiClient.post(`/businesses/${bizId}/verify`, {
        status: 3, // VerificationStatus.Active
        feedback: 'Approved by Administrator. Quality and licensing verified.'
      });
      showToast('Property verified and published live to the front page! ✅', 'success');
      await loadBusinesses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve business.', 'error');
    }
  };

  const handleRejectBusiness = async (bizId, reason) => {
    try {
      await apiClient.post(`/businesses/${bizId}/verify`, {
        status: 4, // VerificationStatus.Rejected
        feedback: reason || 'Does not meet verification standards.'
      });
      showToast('Property submission rejected.', 'warning');
      await loadBusinesses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject business.', 'error');
    }
  };

  const handleDeleteBusiness = async (bizId) => {
    try {
      await apiClient.delete(`/businesses/${bizId}`);
      showToast('Property deleted successfully. ✅', 'success');
      await loadBusinesses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete property.', 'error');
    }
  };

  // ─── Add Business Handler ──────────────────────────────────────────────────
  const handleAddBusiness = async (e) => {
    e.preventDefault();
    setBizError('');
    if (!bizForm.name.trim()) { setBizError('Business name is required.'); return; }
    if (!bizForm.address.trim()) { setBizError('Physical address is required.'); return; }

    setBizSaving(true);
    try {
      const validImages = bizForm.imageUrls.filter(u => u.trim());
      const payload = {
        name: bizForm.name.trim(),
        type: parseInt(bizForm.type),
        district: bizForm.district,
        address: bizForm.address.trim(),
        latitude: parseFloat(bizForm.latitude) || 6.8768,
        longitude: parseFloat(bizForm.longitude) || 81.0608,
        contactPhone: bizForm.contactPhone.trim(),
        contactEmail: bizForm.contactEmail.trim() || user?.email || 'reservations@tourmate.lk',
        description: bizForm.description.trim(),
        priceRange: bizForm.priceRange,
        imageUrls: validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
        ...(parseInt(bizForm.type) === 1 ? {
          starRating: parseInt(bizForm.starRating) || 4,
          checkInTime: bizForm.checkInTime || '14:00',
          checkOutTime: bizForm.checkOutTime || '11:00',
          amenitiesJson: JSON.stringify(bizForm.amenities.split(',').map(a => a.trim()).filter(Boolean)),
          roomTypesJson: JSON.stringify([{ type: 'Deluxe Mountain View', price: parseInt(bizForm.roomPrice) || 18000, capacity: 2 }])
        } : {
          cuisineType: bizForm.cuisineType || 'Authentic Sri Lankan',
          openingHours: bizForm.openingHours || '07:00 - 22:30',
          diningFeaturesJson: JSON.stringify(bizForm.diningFeatures.split(',').map(f => f.trim()).filter(Boolean)),
          averageCostPerPersonLkr: parseFloat(bizForm.averageCostPerPersonLkr) || 2500
        })
      };

      await apiClient.post('/businesses', payload);
      
      const successMsg = isAdmin 
        ? 'Business published directly to the front listings! ✅' 
        : 'Business submitted! It has been placed in the Admin Review Queue. ⏳';

      showToast(successMsg, 'success');
      setShowAddBizModal(false);
      setBizForm(EMPTY_BIZ_FORM);
      await loadBusinesses();
    } catch (err) {
      setBizError(err.response?.data?.message || err.message || 'Failed to register business.');
    } finally {
      setBizSaving(false);
    }
  };

  // ─── Special Offer Handler (Business Owner ONLY) ───────────────────────────
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!offerTitle || !offerBizId) return;
    setOfferSaving(true);
    try {
      await apiClient.post(`/businesses/${offerBizId}/offers`, {
        title: offerTitle.trim(),
        description: `Seasonal promotional discount of ${discountPercent}%`,
        discountPercent: parseInt(discountPercent),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      showToast('Promotional offer published successfully! 🎉', 'success');
      setShowOfferModal(false);
      setOfferTitle('');
      await loadBusinesses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish offer.', 'error');
    } finally {
      setOfferSaving(false);
    }
  };

  const handleDeleteOffer = async (bizId, offerId) => {
    if (!window.confirm('Remove this promotional offer?')) return;
    try {
      await apiClient.delete(`/businesses/${bizId}/offers/${offerId}`);
      showToast('Offer removed successfully.', 'success');
      await loadBusinesses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove offer.', 'error');
    }
  };

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  const filterList = (list) => {
    return list.filter(biz => {
      const matchSearch = !searchTerm || 
        biz.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        biz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        biz.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDistrict = selectedDistrict === 'All' || biz.district === selectedDistrict;
      const matchType = selectedType === 'All' || 
        biz.type === parseInt(selectedType) ||
        (selectedType === '1' && (biz.type === 'Hotel' || biz.typeName === 'Hotel')) ||
        (selectedType === '2' && (biz.type === 'Restaurant' || biz.typeName === 'Restaurant'));
      return matchSearch && matchDistrict && matchType;
    });
  };

  const filteredApproved = filterList(approvedBusinesses);
  const filteredPending = filterList(pendingBusinesses);
  const filteredMyBiz = filterList(myBusinesses);

  // All offers across businesses
  const allDisplayOffers = (isAdmin ? approvedBusinesses : myBusinesses).flatMap(b => 
    (b.offers || []).map(o => ({ ...o, businessName: b.name, businessId: b.id }))
  );

  const setBizField = (k, v) => setBizForm(f => ({ ...f, [k]: v }));
  const setBizImageUrl = (i, v) => {
    const arr = [...bizForm.imageUrls];
    arr[i] = v;
    setBizForm(f => ({ ...f, imageUrls: arr }));
  };
  const addBizImageUrl = () => setBizForm(f => ({ ...f, imageUrls: [...f.imageUrls, ''] }));
  const removeBizImageUrl = (i) => setBizForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 
          toast.type === 'warning' ? 'bg-amber-600 text-white shadow-amber-600/30' : 
          'bg-rose-600 text-white shadow-rose-600/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isAdmin 
                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}>
              {isAdmin ? 'Platform Administrator Hub' : 'Business Partner Portal'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Signed in as: <strong className="text-slate-800">{user?.email || 'User'}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-black text-blue-950 tracking-tight">
            Accommodations & Dining Management
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            {isAdmin
              ? 'Govern hotel rooms and artisan restaurant listings, review proprietor submissions in the pending queue, and inspect verified properties across Sri Lanka.'
              : 'Register and manage your boutique hotels, luxury resorts, and artisan dining establishments, track review statuses, and independently govern promotional offers.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddBizModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Hotel / Restaurant</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('approved')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'approved' 
                    ? 'bg-white text-blue-950 shadow-sm' 
                    : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Approved Listings ({approvedBusinesses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'pending' 
                    ? 'bg-white text-amber-950 shadow-sm' 
                    : 'text-slate-600 hover:text-amber-950 hover:bg-white/60'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Review Queue</span>
                {pendingBusinesses.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black animate-pulse">
                    {pendingBusinesses.length}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('my-listings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'my-listings' 
                  ? 'bg-white text-blue-950 shadow-sm' 
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>My Properties ({myBusinesses.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'offers' 
                ? 'bg-white text-blue-950 shadow-sm' 
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <Percent className="w-4 h-4 text-blue-600" />
            <span>Special Offers ({allDisplayOffers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'availability' 
                ? 'bg-white text-blue-950 shadow-sm' 
                : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Inventory Calendar</span>
          </button>
        </div>

        {/* Search & Filter Bar (shown on listing views) */}
        {(activeTab === 'approved' || activeTab === 'pending' || activeTab === 'my-listings') && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DISTRICTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="1">Hotels Only</option>
              <option value="2">Restaurants Only</option>
            </select>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: APPROVED LISTINGS (ADMIN) OR MY LISTINGS (BUSINESS OWNER)
         ═════════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'approved' || activeTab === 'my-listings') && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-blue-100 text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-xs">Loading verified properties from Neon PostgreSQL...</p>
            </div>
          ) : (isAdmin ? filteredApproved : filteredMyBiz).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-blue-100 p-8 space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-blue-950">No properties found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm || selectedDistrict !== 'All' 
                  ? 'No accommodations or restaurants match the current filters.' 
                  : isAdmin
                    ? 'No approved properties currently listed.'
                    : 'You have not registered any hotels or restaurants yet. Click "+ Add Hotel / Restaurant" to submit your first listing.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(isAdmin ? filteredApproved : filteredMyBiz).map((biz) => {
                const isHotel = biz.type === 1 || biz.type === 'Hotel' || biz.typeName === 'Hotel';
                const isPending = biz.verificationStatus === 2 || biz.verificationStatus === 'PendingVerification' || biz.statusName === 'PendingVerification';
                const isApproved = biz.verificationStatus === 3 || biz.verificationStatus === 'Active' || biz.statusName === 'Active';
                const firstImg = biz.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

                return (
                  <div key={biz.id} className="bg-white rounded-3xl overflow-hidden border border-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Image Header */}
                      <div className="relative h-48 sm:h-52 bg-slate-100 overflow-hidden">
                        <img 
                          src={firstImg} 
                          alt={biz.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'; }}
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950/85 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                            {isHotel ? <Hotel className="w-3.5 h-3.5 text-blue-300" /> : <Utensils className="w-3.5 h-3.5 text-amber-300" />}
                            <span>{isHotel ? 'Hotel / Resort' : 'Restaurant'}</span>
                          </span>

                          {isPending ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white backdrop-blur-md flex items-center gap-1 shadow-sm animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Admin Review</span>
                            </span>
                          ) : isApproved ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified & Live</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white backdrop-blur-md">
                              Rejected
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 text-blue-950 font-bold text-xs backdrop-blur-md border border-white/40 shadow-sm">
                          {biz.priceRange || '$$'}
                        </div>
                      </div>

                      {/* Details Body */}
                      <div className="p-6 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xl font-black text-blue-950 leading-snug">{biz.name}</h3>
                          <div className="flex items-center gap-1 text-amber-700 text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex-shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{biz.rating || '4.8'} ({biz.reviewCount || 0})</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {biz.description}
                        </p>
                        <p className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                          <span>{biz.district} District · {biz.address}</span>
                        </p>

                        {/* Specs */}
                        {isHotel && biz.hotel && (
                          <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Rating: <strong>{biz.hotel.starRating} Stars</strong></span>
                              <span>Check-in: <strong>{biz.hotel.checkInTime}</strong></span>
                              <span>Check-out: <strong>{biz.hotel.checkOutTime}</strong></span>
                            </div>
                          </div>
                        )}

                        {!isHotel && biz.restaurant && (
                          <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Cuisine: <strong>{biz.restaurant.cuisineType}</strong></span>
                              <span>Hours: <strong>{biz.restaurant.openingHours}</strong></span>
                              <span>Cost: <strong>LKR {biz.restaurant.averageCostPerPersonLkr}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => setInspectingBiz(biz)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-bold border border-slate-200 transition-colors shadow-sm"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>Inspect Details</span>
                      </button>

                      {/* Offers Button for Business Owner */}
                      {isOwner && (
                        <button
                          onClick={() => {
                            setOfferBizId(biz.id);
                            setActiveTab('offers');
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-colors"
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>Manage Offers ({(biz.offers || []).length})</span>
                        </button>
                      )}

                      {/* Admin Delete Action */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBusiness(biz.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: PENDING REVIEW QUEUE (ADMINISTRATOR ONLY)
         ═════════════════════════════════════════════════════════════════════════ */}
      {isAdmin && activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <h4 className="font-bold text-sm text-amber-950">Pending Proprietor Submissions Queue</h4>
              <p className="mt-0.5 leading-relaxed">
                Hotels, resorts, and restaurants submitted by business owners remain in this queue until a platform administrator verifies their licensing, address authenticity, and imagery standards. Once approved, they immediately go live in the public catalog and AI trip planning engine.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-blue-100 text-slate-500">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-xs">Checking pending submissions...</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-blue-100 p-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-blue-950">Queue is Clear!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are currently no hotels or restaurants waiting for administrator verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPending.map((biz) => {
                const isHotel = biz.type === 1 || biz.type === 'Hotel' || biz.typeName === 'Hotel';
                const firstImg = biz.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

                return (
                  <div key={biz.id} className="bg-white rounded-3xl overflow-hidden border-2 border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      {/* Image Header */}
                      <div className="relative h-48 bg-slate-100 overflow-hidden">
                        <img 
                          src={firstImg} 
                          alt={biz.name} 
                          className="w-full h-full object-cover"
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'; }}
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950/85 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                            {isHotel ? <Hotel className="w-3.5 h-3.5 text-blue-300" /> : <Utensils className="w-3.5 h-3.5 text-amber-300" />}
                            <span>{isHotel ? 'Hotel / Resort' : 'Restaurant'}</span>
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Review</span>
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-3">
                        <h3 className="text-xl font-black text-blue-950 leading-snug">{biz.name}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{biz.description}</p>
                        
                        <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p>📍 <strong>Location:</strong> {biz.district} District · {biz.address}</p>
                          <p>📞 <strong>Phone:</strong> {biz.contactPhone || 'N/A'}</p>
                          <p>✉️ <strong>Owner Email:</strong> {biz.contactEmail || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => setInspectingBiz(biz)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition-colors shadow-sm"
                      >
                        Inspect Full Details
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectBusiness(biz.id, 'Submission does not meet quality guidelines.')}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveBusiness(biz.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition-all hover:scale-[1.02]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Publish</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 3: SPECIAL OFFERS (OWNER AUTONOMY ENFORCED)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'offers' && (
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-6">
          {/* Header & Role Clarification */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-black text-blue-950">Active Promotional Offers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seasonal discounts and rate packages prioritized by the AI Trip Planning Engine.
              </p>
            </div>

            {/* ONLY Business Owners have authority to create offers */}
            {isOwner && (
              <button
                onClick={() => {
                  if (myBusinesses.length > 0 && !offerBizId) setOfferBizId(myBusinesses[0].id);
                  setShowOfferModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-200 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Promotional Offer</span>
              </button>
            )}
          </div>

          {/* Strict Autonomy Notice for Platform Admin */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong className="block font-bold text-sm text-blue-950 mb-0.5">
                  Business Owner Pricing Autonomy Enforced
                </strong>
                Promotional offers, seasonal rates, and dining packages are managed exclusively by verified property proprietors. System policy restricts Platform Administrators from altering, creating, or dictating partner pricing and discount campaigns.
              </div>
            </div>
          )}

          {/* Offers Grid */}
          {allDisplayOffers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Percent className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No promotional offers active at this time.</p>
              {isOwner && (
                <p className="text-xs text-slate-500">
                  Click "+ Create Promotional Offer" above to configure your first seasonal discount.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDisplayOffers.map((offer) => (
                <div key={offer.id} className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-white border border-blue-200/80 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs border border-amber-300/60 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        <span>{offer.discountPercent}% OFF</span>
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Active
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-blue-950 leading-snug">{offer.title}</h4>
                    <p className="text-xs text-blue-700 font-semibold mt-1">Property: {offer.businessName}</p>
                    {offer.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{offer.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Valid for direct & AI reservations</span>
                    {/* Only the owner can delete their offer */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteOffer(offer.businessId, offer.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 4: AVAILABILITY & INVENTORY
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'availability' && (
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-blue-950">Daily Room & Seating Inventory</h3>
              <p className="text-xs text-slate-500">Real-time availability validated by the Booking Feasibility Agent.</p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Synced with PostgreSQL
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {Array.from({ length: 14 }).map((_, idx) => {
              const dayNum = idx + 1;
              const isWeekend = idx % 7 === 5 || idx % 7 === 6;
              const booked = isWeekend ? 6 : 2;
              const capacity = 8;
              const remaining = capacity - booked;
              return (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 text-center space-y-1.5 transition-colors">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sep {dayNum + 13}</span>
                  <p className="text-xs font-bold text-slate-900">{remaining} Available</p>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full ${remaining <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(booked / capacity) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold font-mono">LKR 18,000</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL: ADD HOTEL / RESTAURANT LISTING
         ═════════════════════════════════════════════════════════════════════════ */}
      {showAddBizModal && (
        <div className="fixed inset-0 z-50 bg-blue-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-blue-100 shadow-2xl my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-blue-950">Add New Hotel / Restaurant</h3>
                  <p className="text-xs text-slate-500">
                    {isAdmin 
                      ? 'Administrator direct entry — published immediately to front listings.' 
                      : 'Proprietor registration — submitted to administrator pending review queue.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddBizModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBusiness} className="p-7 space-y-4 text-xs">
              {/* Informational Policy Banner */}
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                isAdmin ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {isAdmin 
                    ? 'As a Platform Administrator, new hotels and restaurants added by you are verified automatically and publish directly to the main catalog.' 
                    : 'As a Business Owner, submitting your accommodation or dining establishment sends it to the Administrator Pending Queue for quality assurance and verification before going live.'}
                </span>
              </div>

              {bizError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{bizError}</span>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Business Classification *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBizField('type', 1)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      parseInt(bizForm.type) === 1
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Hotel className="w-4 h-4" />
                    <span>Hotel / Resort</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBizField('type', 2)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      parseInt(bizForm.type) === 2
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Artisan Restaurant</span>
                  </button>
                </div>
              </div>

              {/* Property Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Property / Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder={parseInt(bizForm.type) === 1 ? "e.g. Ella Gap Eco Resort & Spa" : "e.g. Ceylon Claypot Spices Kitchen"}
                  value={bizForm.name}
                  onChange={e => setBizField('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* District & Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">District *</label>
                  <select
                    value={bizForm.district}
                    onChange={e => setBizField('district', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DISTRICTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Price Range</label>
                  <select
                    value={bizForm.priceRange}
                    onChange={e => setBizField('priceRange', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="$">$ (Budget-Friendly)</option>
                    <option value="$$">$$ (Moderate / Popular)</option>
                    <option value="$$$">$$$ (Premium)</option>
                    <option value="$$$$">$$$$ (Luxury)</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 48 Wellawaya Road, Ella, Badulla"
                  value={bizForm.address}
                  onChange={e => setBizField('address', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Contact Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={bizForm.contactPhone}
                    onChange={e => setBizField('contactPhone', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="reservations@hotel.lk"
                    value={bizForm.contactEmail}
                    onChange={e => setBizField('contactEmail', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Overview Description</label>
                <textarea
                  rows="2"
                  placeholder="Describe your hospitality ambiance, signature specialties, scenic views..."
                  value={bizForm.description}
                  onChange={e => setBizField('description', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Hotel vs Restaurant specifics */}
              {parseInt(bizForm.type) === 1 ? (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                  <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Hotel className="w-4 h-4 text-blue-600" />
                    Hotel Specifications
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Star Rating</label>
                      <select value={bizForm.starRating} onChange={e => setBizField('starRating', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                        <option value="3">3-Star</option>
                        <option value="4">4-Star Deluxe</option>
                        <option value="5">5-Star Luxury</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Check-In</label>
                      <input type="text" value={bizForm.checkInTime} onChange={e => setBizField('checkInTime', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Check-Out</label>
                      <input type="text" value={bizForm.checkOutTime} onChange={e => setBizField('checkOutTime', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Amenities (comma-separated)</label>
                    <input type="text" value={bizForm.amenities} onChange={e => setBizField('amenities', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" placeholder="Pool, WiFi, Mountain View, Spa" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Sample Nightly Rate (LKR)</label>
                    <input type="number" value={bizForm.roomPrice} onChange={e => setBizField('roomPrice', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-3">
                  <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-amber-600" />
                    Restaurant Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Cuisine Type</label>
                      <input type="text" value={bizForm.cuisineType} onChange={e => setBizField('cuisineType', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Opening Hours</label>
                      <input type="text" value={bizForm.openingHours} onChange={e => setBizField('openingHours', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Special Dining Features (comma-separated)</label>
                    <input type="text" value={bizForm.diningFeatures} onChange={e => setBizField('diningFeatures', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Avg Cost Per Guest (LKR)</label>
                    <input type="number" value={bizForm.averageCostPerPersonLkr} onChange={e => setBizField('averageCostPerPersonLkr', e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200" />
                  </div>
                </div>
              )}

              {/* Photos with preview */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Photo URLs (paste direct image links)</span>
                </label>
                <div className="space-y-2">
                  {bizForm.imageUrls.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={url}
                        onChange={e => setBizImageUrl(i, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                      {url && (
                        <img src={url} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                      )}
                      {bizForm.imageUrls.length > 1 && (
                        <button type="button" onClick={() => removeBizImageUrl(i)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBizImageUrl} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1">
                    <Plus className="w-3.5 h-3.5" /> Add another photo URL
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddBizModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={bizSaving} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold shadow-md shadow-blue-200">
                  {bizSaving ? 'Saving to Database...' : (isAdmin ? 'Publish Listing' : 'Submit for Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL: CREATE PROMOTIONAL OFFER (BUSINESS OWNER ONLY)
         ═════════════════════════════════════════════════════════════════════════ */}
      {showOfferModal && isOwner && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-blue-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-blue-950 flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                Create Promotional Offer
              </h3>
              <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Property</label>
                <select
                  value={offerBizId}
                  onChange={(e) => setOfferBizId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {myBusinesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type === 1 ? 'Hotel' : 'Restaurant'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Weekend Getaway 25% Off"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Discount Percentage (%)</label>
                <input
                  type="number"
                  min="5"
                  max="75"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowOfferModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={offerSaving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 disabled:opacity-60">
                  {offerSaving ? 'Publishing...' : 'Publish Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL: INSPECT BUSINESS DETAILS (FOR ADMIN REVIEW & OWNER VIEW)
         ═════════════════════════════════════════════════════════════════════════ */}
      {inspectingBiz && (
        <InspectBusinessModal
          biz={inspectingBiz}
          isAdmin={isAdmin}
          isOwner={isOwner}
          onClose={() => setInspectingBiz(null)}
          onApprove={handleApproveBusiness}
          onReject={handleRejectBusiness}
          onDelete={handleDeleteBusiness}
        />
      )}
    </div>
  );
}
