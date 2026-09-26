import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function validate(email, password) {
  const errs = {};
  if (!email.trim())
    errs.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errs.email = 'Please enter a valid email address.';
  if (!password)
    errs.password = 'Password is required.';
  else if (password.length < 6)
    errs.password = 'Password must be at least 6 characters.';
  return errs;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [errors, setErrors]         = useState({});
  const [apiError, setApiError]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [touched, setTouched]       = useState({ email: false, password: false });

  const liveErrors = validate(email, password);

  const handleBlur = (field) => setTouched(t => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate(email, password);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError('');
    try {
      await login(email.trim().toLowerCase(), password);
      // The system automatically unlocks the appropriate dashboard (Admin or Business Owner)
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.message
               || err?.response?.data?.message
               || err?.response?.data?.errors?.[0]
               || 'Invalid credentials. Please verify your email and password.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{
        backgroundImage: 'url(/destinations/sigiriya.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark blue overlay — keeps photo subtle, not distracting */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/92 via-blue-900/88 to-blue-800/90" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to landing */}
        <Link to="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-8 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-blue-100">
          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="TourMate" className="w-20 h-20 object-contain mb-3" />
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3.5 py-1 rounded-full border border-blue-200 mb-2">
              <Building2 className="w-3.5 h-3.5" /> Operations & Partner Portal
            </span>
            <h1 className="text-2xl font-black text-blue-950">Portal Sign In</h1>
            <p className="text-slate-500 text-sm mt-1 text-center">
              Sign in with your registered email to access your management dashboard
            </p>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{apiError}</p>
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@company.lk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`input-blue pl-10 ${(touched.email && liveErrors.email) ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {touched.email && liveErrors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`input-blue pl-10 pr-10 ${(touched.password && liveErrors.password) ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && liveErrors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {liveErrors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6 py-3.5 text-base font-bold"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating…</>
                : 'Sign In to Management Portal'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Need to list your business?{' '}
            <Link to="/register" id="login-register-link" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">
              Register your business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
