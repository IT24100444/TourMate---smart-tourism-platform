import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Star, Phone, Mail, ChevronDown, Menu, X,
  ArrowRight, Shield, Zap, Users, Globe, Building2, Utensils,
  CalendarCheck, Sparkles, CheckCircle2, TrendingUp, DollarSign
} from 'lucide-react';

// ── Authentic Sri Lankan Destination Slides with Generated Photography ─────────
const SLIDES = [
  {
    image: '/destinations/sigiriya.jpg',
    title: 'Sigiriya Rock Fortress',
    district: 'Matale',
    desc: 'Ancient 5th-century royal citadel and UNESCO World Heritage monument surrounded by premier eco-resorts, boutique villas, and high-spending international travelers.',
    rating: 4.9, reviews: 310,
    partnerCount: '24 Partner Hotels & Dining Venues'
  },
  {
    image: '/destinations/nine_arch_bridge.jpg',
    title: 'Nine Arch Bridge, Ella',
    district: 'Badulla',
    desc: 'Iconic colonial stone viaduct viaduct amidst lush Ceylon tea estates — one of Sri Lanka\'s most visited hill country destinations with booming hospitality demand.',
    rating: 4.9, reviews: 128,
    partnerCount: '32 Partner Eco-Lodges & Cafes'
  },
  {
    image: '/destinations/galle_fort.jpg',
    title: 'Galle Dutch Fort',
    district: 'Galle',
    desc: '17th-century coastal UNESCO fortification housing Sri Lanka\'s most celebrated boutique heritage hotels, artisanal bistros, and coastal retreats.',
    rating: 4.8, reviews: 240,
    partnerCount: '45 Partner Heritage Venues'
  },
  {
    image: '/destinations/little_adams_peak.jpg',
    title: "Little Adam's Peak",
    district: 'Badulla',
    desc: 'World-renowned hiking ridge overlooking dramatic Ella Gap mountain panoramas, surrounded by hillside luxury villas and scenic dining venues.',
    rating: 4.8, reviews: 95,
    partnerCount: '19 Partner Mountain Retreats'
  },
];

// ── Hospitality Partner Solutions ────────────────────────────────────────────
const HOSPITALITY_SOLUTIONS = [
  {
    title: 'Hotels, Eco-Lodges & Boutique Villas',
    tag: 'Accommodation Operators',
    image: '/hospitality/resort.jpg',
    desc: 'Maximize room occupancy with dynamic availability calendars, verified quality badges, and direct guest reservations across Sri Lanka.',
    perks: [
      'Real-time room capacity & availability slot controls',
      'Direct guest booking requests with instant confirm/reject',
      'Automated inclusion in AI multi-agent tourist itineraries',
      'Zero commission on direct tourist inquiries',
    ],
  },
  {
    title: 'Artisan Restaurants, Cafes & Dining',
    tag: 'Culinary Operators',
    image: '/hospitality/dining.jpg',
    desc: 'Showcase your authentic culinary experience, manage dining slot allocations, and run targeted seasonal dining promotions.',
    perks: [
      'Dining features, cuisine tags & digital menu showcase',
      'Table reservation queue with instant status updates',
      'Publish promotional dining offers (e.g. 15% off Early Bird)',
      'Verified traveler reviews and customer feedback loop',
    ],
  },
];

// ── Partner Features ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Shield,
    title: 'Verified Business Certification',
    desc: 'Gain instant credibility. Every listed hotel and restaurant receives platform verification from tourism authorities, building traveler trust.'
  },
  {
    icon: CalendarCheck,
    title: 'Centralized Booking Management',
    desc: 'Full-featured booking state machine. Confirm, complete, or review reservations with live transition histories and zero scheduling friction.'
  },
  {
    icon: TrendingUp,
    title: 'Dynamic Availability Engine',
    desc: 'Maintain daily inventory slots, room allocations, and table capacities with ease. Keep travelers informed with accurate real-time availability.'
  },
  {
    icon: DollarSign,
    title: 'Promotional Offers Publisher',
    desc: 'Launch targeted discounts and seasonal campaigns anytime. Highlight your venue during peak tourist seasons and boost off-peak bookings.'
  },
  {
    icon: Zap,
    title: 'Multi-Agent AI Recommendation',
    desc: 'TourMate’s intelligent multi-agent planner automatically pairs tourists’ budgets with verified partner hotels and dining venues.'
  },
  {
    icon: Globe,
    title: 'Unified Operational Analytics',
    desc: 'Supervise listing health, visitor engagement, confirmed revenue, and authentic traveler reviews from a clean, intuitive management workspace.'
  },
];

// ── Partner Stats ────────────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Partner Hotels & Eco-Lodges' },
  { value: '350+', label: 'Artisan Dining Venues' },
  { value: '25',   label: 'Districts Across Sri Lanka' },
  { value: '99.4%', label: 'Host Satisfaction Rate' },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide]     = useState(0);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const [contactForm, setContactForm]       = useState({ name: '', email: '', businessName: '', message: '' });
  const [contactErrors, setContactErrors]   = useState({});
  const [contactSuccess, setContactSuccess] = useState(false);
  const intervalRef = useRef(null);

  // Auto-advance slideshow
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToSlide = (i) => {
    setCurrentSlide(i);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % SLIDES.length), 5500);
  };

  // ── Contact validation ─────────────────────────────────────────────────────
  const validateContact = () => {
    const errs = {};
    if (!contactForm.name.trim() || contactForm.name.trim().length < 2)
      errs.name = 'Contact name is required.';
    if (!contactForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email))
      errs.email = 'Valid business email is required.';
    if (!contactForm.businessName.trim())
      errs.businessName = 'Business or property name is required.';
    if (!contactForm.message.trim() || contactForm.message.trim().length < 10)
      errs.message = 'Message must be at least 10 characters.';
    return errs;
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const errs = validateContact();
    if (Object.keys(errs).length) { setContactErrors(errs); return; }
    setContactErrors({});
    setContactSuccess(true);
    setContactForm({ name: '', email: '', businessName: '', message: '' });
    setTimeout(() => setContactSuccess(false), 5000);
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ═══ STICKY NAVBAR ═══════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TourMate Logo" className="h-12 w-12 object-contain" />
            <div>
              <span className={`text-xl font-black ${scrolled ? 'text-blue-950' : 'text-white'}`}>
                Tour<span className="text-blue-500">Mate</span>
              </span>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${scrolled ? 'text-blue-600' : 'text-blue-200'}`}>
                Partner & Management Portal
              </p>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Home',         href: '#hero' },
              { label: 'Corridors',    href: '#destinations' },
              { label: 'Solutions',    href: '#solutions' },
              { label: 'Features',     href: '#features' },
              { label: 'About',        href: '#about' },
              { label: 'Partner Inquiries', href: '#contact' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm font-semibold transition-colors hover:text-blue-400 ${
                  scrolled ? 'text-slate-700' : 'text-blue-100'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              id="nav-login-btn"
              className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 border-2 ${
                scrolled
                  ? 'border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white'
                  : 'border-white/60 text-white hover:bg-white/10'
              }`}
            >
              Partner Sign In
            </Link>
            <Link
              to="/register"
              id="nav-register-btn"
              className="text-sm font-bold px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/30"
            >
              Register Business
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMenuOpen(o => !o)}
            className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-slate-700' : 'text-white'}`}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-blue-100 px-6 py-4 space-y-3 shadow-xl">
            {['Home', 'Corridors', 'Solutions', 'Features', 'About', 'Contact'].map(label => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="block text-slate-700 font-semibold py-2 hover:text-blue-600"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" className="btn-outline text-center py-2.5 text-sm">Partner Sign In</Link>
              <Link to="/register" className="btn-primary text-center py-2.5 text-sm">Register Business</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO – HOSPITALITY OPERATIONS & DESTINATION CORRIDORS ═══════════ */}
      <section id="hero" className="relative h-screen min-h-[640px] overflow-hidden">
        {/* Slide images */}
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover"
            />
            {/* Rich gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-900/80 to-blue-800/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent" />
          </div>
        ))}

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 max-w-7xl mx-auto">
          <div className="max-w-3xl">
            {/* Partner corridor pill */}
            <div className="inline-flex items-center gap-2 bg-blue-500/25 border border-blue-400/40 rounded-full px-4 py-1.5 mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-blue-200 text-sm font-semibold">
                Sri Lanka Tourism Partner Network • {slide.district} Corridor
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-tight mb-4 animate-fade-in-up delay-100">
              Grow Your Tourism Business in Sri Lanka
            </h1>
            <p className="text-lg md:text-xl text-blue-100/90 mb-8 max-w-2xl leading-relaxed animate-fade-in-up delay-200 font-normal">
              The unified operational portal for Sri Lanka's hotels, eco-lodges, boutique villas, and artisan restaurants. 
              Control live room and dining availability, publish seasonal promotions, and manage direct traveler reservations.
            </p>

            {/* Partner CTAs (No "Plan my trip") */}
            <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <Link
                to="/register"
                id="hero-register-biz-btn"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-blue-900/50 hover:scale-[1.02]"
              >
                <Building2 className="w-5 h-5" /> Register Your Business
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                id="hero-login-btn"
                className="inline-flex items-center gap-2 border-2 border-white/60 hover:border-white text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 hover:bg-white/10"
              >
                Partner Sign In
              </Link>
              <a
                href="#destinations"
                className="inline-flex items-center gap-2 text-blue-200 hover:text-white font-medium px-4 py-4 transition-colors text-sm"
              >
                View Destination Corridors ↓
              </a>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-28 left-6 md:left-8 flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === currentSlide ? 'w-10 h-2.5 bg-blue-400' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-blue-200 animate-bounce">
          <span className="text-[11px] font-bold tracking-widest uppercase">Scroll Down</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ═══ STATS BAR ═══════════════════════════════════════════════════════ */}
      <section className="bg-blue-900 py-10 border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white mb-1">{s.value}</p>
              <p className="text-blue-300 text-xs sm:text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DESTINATIONS SECTION – PROMINENT SQUARES (SLIGHTLY LARGER) ═════ */}
      <section id="destinations" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Tourism Corridors
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-950 mb-4">
              High-Traffic Destination Corridors
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              TourMate connects your hospitality property directly with international travelers visiting Sri Lanka’s most celebrated attractions.
            </p>
          </div>

          {/* 4 Slightly Bigger Squares (h-80, rounded-3xl, rich padding) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {SLIDES.map((dest, i) => (
              <div
                key={i}
                className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 bg-blue-950 flex flex-col justify-end cursor-pointer h-84 min-h-[340px]"
                onClick={() => goToSlide(i)}
              >
                {/* Authentic Matched Image */}
                <img
                  src={dest.image}
                  alt={dest.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Dark Vignette Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/60 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="bg-blue-950/80 backdrop-blur-md text-blue-200 border border-blue-400/30 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {dest.district}
                  </span>
                  <span className="bg-blue-950/80 backdrop-blur-md text-yellow-400 border border-yellow-400/30 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {dest.rating}
                  </span>
                </div>

                {/* Bottom Card Content */}
                <div className="relative z-10 p-6 space-y-2">
                  <h3 className="text-white font-extrabold text-xl leading-tight group-hover:text-blue-300 transition-colors">
                    {dest.title}
                  </h3>
                  <p className="text-blue-100/80 text-xs line-clamp-2 leading-relaxed font-normal">
                    {dest.desc}
                  </p>
                  <div className="pt-2 border-t border-blue-800/80 flex items-center justify-between text-[11px] text-blue-300 font-semibold">
                    <span>{dest.partnerCount}</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                      Corridor Hub →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action for Business Owners */}
          <div className="text-center mt-14">
            <Link
              to="/register"
              id="destinations-partner-cta"
              className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:scale-[1.02]"
            >
              <Building2 className="w-5 h-5" /> List Your Property in These Corridors
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ HOSPITALITY SOLUTIONS SECTION ═══════════════════════════════════ */}
      <section id="solutions" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Tailored Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-950 mb-4">
              Dedicated Portals for Hotels & Dining
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              Everything Sri Lankan hospitality operators need to drive direct bookings, supervise inventory, and manage guest experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {HOSPITALITY_SOLUTIONS.map((sol, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-blue-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="h-64 sm:h-72 w-full overflow-hidden relative">
                  <img
                    src={sol.image}
                    alt={sol.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-blue-950/80 backdrop-blur-md text-white border border-blue-400/30 text-xs font-bold px-3.5 py-1.5 rounded-full">
                    {sol.tag}
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-blue-950 mb-3">{sol.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{sol.desc}</p>
                    <div className="space-y-3">
                      {sol.perks.map((perk, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 text-sm font-medium">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <Link
                      to="/register"
                      className="btn-outline w-full flex items-center justify-center gap-2 py-3 text-sm font-bold"
                    >
                      Register as {sol.tag.replace('Operators', 'Partner')} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-slate-50 border-t border-blue-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-950 mb-4">
              Enterprise Tools Built for Sri Lankan Hospitality
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              Engineered with clean architectural principles to give business owners and administrators full operational control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-8 border border-blue-100 shadow-sm hover:shadow-lg transition-all duration-300 card-hover group"
                >
                  <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                    <Icon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-950 mb-3">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT SECTION ═══════════════════════════════════════════════════ */}
      <section id="about" className="py-24 hero-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block bg-blue-500/20 text-blue-200 text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-blue-400/30 uppercase tracking-wider">
                About TourMate
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Empowering Sri Lanka’s Tourism Infrastructure
              </h2>
              <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-6 font-normal">
                TourMate was created as an integrated full-stack platform designed specifically to modernize Sri Lanka's tourism economy.
                We bridge international travelers directly with verified local hotels, eco-lodges, boutique resorts, and artisan dining establishments.
              </p>
              <p className="text-blue-200 leading-relaxed mb-8 text-sm sm:text-base">
                Our platform provides <strong className="text-white">Business Owners</strong> with live inventory governance, reservation queues, and offer distribution tools, while giving <strong className="text-white">Platform Administrators</strong> a centralized moderation hub for quality assurance.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  id="about-register-btn"
                  className="inline-flex items-center gap-2 bg-white text-blue-950 hover:bg-blue-50 font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl hover:scale-105"
                >
                  Join as a Business Partner <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  id="about-signin-btn"
                  className="inline-flex items-center gap-2 border-2 border-white/60 hover:border-white text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 hover:bg-white/10"
                >
                  Partner Sign In
                </Link>
              </div>
            </div>

            {/* Logo showcase */}
            <div className="relative flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 sm:w-80 sm:h-80 bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl flex items-center justify-center shadow-2xl p-6">
                  <img src="/logo.png" alt="TourMate" className="w-60 h-60 object-contain drop-shadow-lg" />
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-2.5 text-center border border-blue-100">
                  <p className="text-2xl font-black text-blue-950">25</p>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase">Districts Active</p>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-blue-600 rounded-2xl shadow-xl px-4 py-2.5 text-center border border-blue-400">
                  <p className="text-2xl font-black text-white">850+</p>
                  <p className="text-[11px] text-blue-200 font-semibold uppercase">Listed Partners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA BAND – BUSINESS ONBOARDING ═══════════════════════════════════ */}
      <section className="py-20 bg-blue-50 border-y border-blue-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
            Ready to Get Started?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-blue-950 mb-4">
            List Your Hotel or Restaurant on TourMate
          </h2>
          <p className="text-slate-600 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Take minutes to set up your business account. Start managing room inventory, table reservations, and verified seasonal offers today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              id="cta-register-btn"
              className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:scale-[1.02]"
            >
              <Building2 className="w-5 h-5" /> Register Your Business Now
            </Link>
            <Link
              to="/login"
              id="cta-login-btn"
              className="btn-outline inline-flex items-center gap-2 text-base px-8 py-4 rounded-2xl hover:scale-[1.02]"
            >
              Sign In to Management Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT US – PARTNER INQUIRIES ═════════════════════════════════ */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                Partner Support
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-950 mb-6">
                Have Questions About Partnering?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
                Our tourism operations team is here to assist hoteliers, restaurateurs, and attraction managers with onboarding, verification, and API integrations.
              </p>

              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Partner Operations Email</p>
                    <p className="text-blue-950 font-bold">partners@tourmate.lk</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Hospitality Support Hotline</p>
                    <p className="text-blue-950 font-bold">+94 11 234 5678 / +94 77 987 6543</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Headquarters</p>
                    <p className="text-blue-950 font-bold">TourMate Operations Centre, Colombo 03, Sri Lanka</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 border border-blue-100 shadow-sm">
              <h3 className="text-2xl font-black text-blue-950 mb-2">Send an Onboarding Inquiry</h3>
              <p className="text-slate-500 text-sm mb-6">Our partner onboarding lead will respond within 24 hours.</p>

              {contactSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-800 text-sm font-semibold">
                    Inquiry submitted! Our partnership specialist will contact you shortly.
                  </p>
                </div>
              )}

              <form onSubmit={handleContactSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Proprietor / Manager Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Perera"
                    value={contactForm.name}
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    className="input-blue"
                  />
                  {contactErrors.name && <p className="text-red-500 text-xs mt-1">{contactErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Business / Property Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ella Gap Eco Resort or Cafe Chill"
                    value={contactForm.businessName}
                    onChange={e => setContactForm({ ...contactForm, businessName: e.target.value })}
                    className="input-blue"
                  />
                  {contactErrors.businessName && <p className="text-red-500 text-xs mt-1">{contactErrors.businessName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Business Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. manager@resort.lk"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="input-blue"
                  />
                  {contactErrors.email && <p className="text-red-500 text-xs mt-1">{contactErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Message / Business Details *</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your property, room/table capacities, and location..."
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    className="input-blue resize-none"
                  />
                  {contactErrors.message && <p className="text-red-500 text-xs mt-1">{contactErrors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 mt-4"
                >
                  Submit Partner Inquiry <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="bg-blue-950 text-slate-400 py-12 border-t border-blue-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TourMate" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-white font-black text-base">TourMate Sri Lanka</p>
              <p className="text-xs text-blue-300">Hospitality & Platform Operations Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/login" className="hover:text-white transition-colors">Partner Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register Business</Link>
            <a href="#destinations" className="hover:text-white transition-colors">Corridors</a>
            <a href="#contact" className="hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 TourMate Sri Lanka. Built for Academic & Industry Hospitality Operations.
          </p>
        </div>
      </footer>
    </div>
  );
}
