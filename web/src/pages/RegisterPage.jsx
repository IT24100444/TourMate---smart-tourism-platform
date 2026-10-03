import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

// ── Validators ────────────────────────────────────────────────────────────────
function validate(form) {
  const errs = {};
  if (!form.fullName.trim() || form.fullName.trim().length < 2)
    errs.fullName = 'Contact or proprietor name must be at least 2 characters.';
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = 'Please enter a valid business email address.';
  if (!form.password)
    errs.password = 'Password is required.';
  else if (form.password.length < 8)
    errs.password = 'Password must be at least 8 characters.';
  else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/.test(form.password))
    errs.password = 'Must include uppercase, lowercase, number, and special character.';
  if (form.confirmPassword !== form.password)
    errs.confirmPassword = 'Passwords do not match.';
  if (form.phoneNumber && !/^\+?[\d\s\-()]{7,15}$/.test(form.phoneNumber))
    errs.phoneNumber = 'Please enter a valid contact phone number.';
  return errs;
}

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 chars', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number',           ok: /\d/.test(password) },
    { label: 'Special char',     ok: /[\W_]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const color = score <= 2 ? 'bg-red-400' : score <= 3 ? 'bg-yellow-400' : score === 4 ? 'bg-blue-400' : 'bg-green-500';
  const label = score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <span className={`text-xs font-semibold ${score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-600' : score === 4 ? 'text-blue-600' : 'text-green-600'}`}>
          {password ? label : ''}
        </span>
      </div>
      {password && (
        <div className="grid grid-cols-2 gap-1">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-center gap-1 text-[11px] ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>
              <CheckCircle className={`w-3 h-3 ${c.ok ? 'text-green-500' : 'text-slate-300'}`} />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errors, setErrors]             = useState({});
  const [touched, setTouched]           = useState({});
  const [apiError, setApiError]         = useState('');
  const [loading, setLoading]           = useState(false);

  const liveErrors = validate(form);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleBlur = (field) => setTouched(t => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(form).map(k => [k, true]));
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError('');
    try {
      const payload = {
        fullName:    form.fullName.trim(),
        email:       form.email.trim().toLowerCase(),
        password:    form.password,
        phoneNumber: form.phoneNumber ? form.phoneNumber.trim() : undefined,
        role:        'BusinessOwner', // Web registration is strictly for Business Partners
      };
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message
               || err?.response?.data?.errors?.[0]
               || 'Registration failed. Please check your details and try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) => touched[key] && liveErrors[key];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{
        backgroundImage: 'url(/destinations/galle_fort.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark blue overlay — keeps photo subtle, not distracting */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/92 via-blue-900/88 to-blue-800/90" />

      <div className="w-full max-w-lg relative z-10">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-8 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-blue-100">
          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="TourMate" className="w-20 h-20 object-contain mb-3" />
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3.5 py-1 rounded-full border border-blue-200 mb-2">
              <Building2 className="w-3.5 h-3.5" /> Hospitality Partner Registration
            </span>
            <h1 className="text-2xl font-black text-blue-950 text-center">Register Your Business</h1>
            <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
              List your hotel, eco-lodge, villa, or artisan dining establishment on TourMate
            </p>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{apiError}</p>
            </div>
          )}

          <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Proprietor / Manager Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Sunil Perera"
                  value={form.fullName}
                  onChange={e => setField('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  className={`input-blue pl-10 ${fieldError('fullName') ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {fieldError('fullName') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.fullName}
                </p>
              )}
            </div>

            {/* Business Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Business Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. stay@ellagapresort.lk"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`input-blue pl-10 ${fieldError('email') ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {fieldError('email') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={form.phoneNumber}
                  onChange={e => setField('phoneNumber', e.target.value)}
                  onBlur={() => handleBlur('phoneNumber')}
                  className={`input-blue pl-10 ${fieldError('phoneNumber') ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {fieldError('phoneNumber') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.phoneNumber}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`input-blue pl-10 pr-10 ${fieldError('password') ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
              {fieldError('password') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={e => setField('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`input-blue pl-10 pr-10 ${fieldError('confirmPassword') ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldError('confirmPassword') && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6 py-3.5 text-base font-bold"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating partner account…</>
                : 'Create Business Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered as a partner?{' '}
            <Link to="/login" id="register-login-link" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">
              Sign in to Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
