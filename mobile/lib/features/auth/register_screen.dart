import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> with SingleTickerProviderStateMixin {
  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _passCtrl    = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _phoneCtrl   = TextEditingController();

  bool _obscure        = true;
  bool _obscureConfirm = true;
  bool _loading        = false;
  String? _error;

  late AnimationController _animCtrl;
  late Animation<double>   _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut),
    );
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  // ── Validators ─────────────────────────────────────────────────────────────
  String? _validateName(String? v) {
    if (v == null || v.trim().length < 2) return 'Full name must be at least 2 characters';
    return null;
  }

  String? _validateEmail(String? v) {
    if (v == null || v.trim().isEmpty) return 'Email is required';
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return 'Enter a valid email address';
    return null;
  }

  String? _validatePassword(String? v) {
    if (v == null || v.isEmpty) return 'Password is required';
    if (v.length < 8) return 'At least 8 characters required';
    if (!RegExp(r'(?=.*[A-Z])').hasMatch(v)) return 'Must include an uppercase letter';
    if (!RegExp(r'(?=.*[a-z])').hasMatch(v)) return 'Must include a lowercase letter';
    if (!RegExp(r'(?=.*\d)').hasMatch(v))    return 'Must include a number';
    if (!RegExp(r'(?=.*[\W_])').hasMatch(v)) return 'Must include a special character';
    return null;
  }

  String? _validateConfirm(String? v) {
    if (v != _passCtrl.text) return 'Passwords do not match';
    return null;
  }

  String? _validatePhone(String? v) {
    if (v == null || v.trim().isEmpty) return null; // optional
    if (!RegExp(r'^\+?[\d\s\-()]{7,15}$').hasMatch(v)) return 'Enter a valid phone number';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      // Exclusively register as Tourist on mobile
      final response = await ApiClient.register(
        fullName:    _nameCtrl.text.trim(),
        email:       _emailCtrl.text.trim().toLowerCase(),
        password:    _passCtrl.text,
        phoneNumber: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        role:        'Tourist',
      ).timeout(const Duration(seconds: 10));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = body['data'] ?? body;
        final token  = data['token'] as String? ?? '';
        final userId = data['userId']?.toString() ?? data['id']?.toString() ?? '';
        final email  = data['email'] as String? ?? _emailCtrl.text.trim().toLowerCase();

        AuthProvider.setSession(token: token, userId: userId, email: email);

        if (!mounted) return;
        Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
      } else {
        final msg = body['message'] ?? body['errors']?[0] ?? 'Registration failed. Please check your details.';
        setState(() => _error = msg);
      }
    } catch (e) {
      setState(() => _error = 'Cannot connect to server. Please verify backend is running.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Password strength ───────────────────────────────────────────────────────
  int get _passwordStrength {
    final p = _passCtrl.text;
    int score = 0;
    if (p.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(p)) score++;
    if (RegExp(r'[a-z]').hasMatch(p)) score++;
    if (RegExp(r'\d').hasMatch(p))    score++;
    if (RegExp(r'[\W_]').hasMatch(p)) score++;
    return score;
  }

  Color get _strengthColor {
    final s = _passwordStrength;
    if (s <= 2) return AppTheme.errorRed;
    if (s <= 3) return const Color(0xFFF59E0B);
    if (s == 4) return const Color(0xFF3B82F6);
    return AppTheme.successGreen;
  }

  String get _strengthLabel {
    final s = _passwordStrength;
    if (_passCtrl.text.isEmpty) return '';
    if (s <= 2) return 'Weak';
    if (s <= 3) return 'Fair';
    if (s == 4) return 'Good';
    return 'Strong';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      resizeToAvoidBottomInset: true,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background Travel Photography
          Image.asset(
            'assets/images/auth_bg.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: const Color(0xFF1E3A8A)),
          ),

          // Deep Dark Gradient Overlay
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x990F172A),
                  Color(0xB30A1128),
                  Color(0xF5050B14),
                ],
                stops: [0.0, 0.4, 1.0],
              ),
            ),
          ),

          // Phone-Constrained Centered Content
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Top Bar with Back Button
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                              onPressed: () => Navigator.pop(context),
                              tooltip: 'Back to Sign In',
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Create Tourist Account',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Tourist Welcome Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0x332563EB),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0x6660A5FA)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('🌴', style: TextStyle(fontSize: 13)),
                              SizedBox(width: 6),
                              Text(
                                'SRI LANKA TOURIST PASS',
                                style: TextStyle(
                                  color: Color(0xFFDBEAFE),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Frosted Glassmorphism Card
                        ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                            child: Container(
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                color: Colors.white.withAlpha(242),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: Colors.white.withAlpha(180), width: 1.5),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x40000000),
                                    blurRadius: 28,
                                    offset: Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Start Your Journey',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    const Text(
                                      'Free access to AI itinerary planning, hidden gem discovery & bookings',
                                      style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                    ),
                                    const SizedBox(height: 16),

                                    // Error Banner
                                    if (_error != null) ...[
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        margin: const EdgeInsets.only(bottom: 14),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFEF2F2),
                                          border: Border.all(color: const Color(0xFFFECACA)),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.info_outline, color: Color(0xFFEF4444), size: 16),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                _error!,
                                                style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],

                                    // Full Name
                                    TextFormField(
                                      controller: _nameCtrl,
                                      validator: _validateName,
                                      style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                      decoration: InputDecoration(
                                        labelText: 'Full Name *',
                                        hintText: 'e.g. Kasun Silva',
                                        prefixIcon: const Icon(Icons.person_outline_rounded, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                    ),
                                    const SizedBox(height: 12),

                                    // Email Address
                                    TextFormField(
                                      controller: _emailCtrl,
                                      keyboardType: TextInputType.emailAddress,
                                      validator: _validateEmail,
                                      style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                      decoration: InputDecoration(
                                        labelText: 'Email Address *',
                                        hintText: 'tourist@example.com',
                                        prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                    ),
                                    const SizedBox(height: 12),

                                    // Password
                                    TextFormField(
                                      controller: _passCtrl,
                                      obscureText: _obscure,
                                      onChanged: (_) => setState(() {}),
                                      validator: _validatePassword,
                                      style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                      decoration: InputDecoration(
                                        labelText: 'Password *',
                                        hintText: 'Min 8 chars, uppercase, number, symbol',
                                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        suffixIcon: IconButton(
                                          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                                          onPressed: () => setState(() => _obscure = !_obscure),
                                        ),
                                      ),
                                    ),

                                    // Strength meter
                                    if (_passCtrl.text.isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.circular(4),
                                              child: LinearProgressIndicator(
                                                value: _passwordStrength / 5,
                                                backgroundColor: const Color(0xFFE2E8F0),
                                                color: _strengthColor,
                                                minHeight: 4,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            _strengthLabel,
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _strengthColor),
                                          ),
                                        ],
                                      ),
                                    ],

                                    const SizedBox(height: 12),

                                    // Confirm Password
                                    TextFormField(
                                      controller: _confirmCtrl,
                                      obscureText: _obscureConfirm,
                                      validator: _validateConfirm,
                                      style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                      decoration: InputDecoration(
                                        labelText: 'Confirm Password *',
                                        hintText: 'Re-enter your password',
                                        prefixIcon: const Icon(Icons.lock_reset_rounded, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        suffixIcon: IconButton(
                                          icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                                          onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 12),

                                    // Phone Number (Optional)
                                    TextFormField(
                                      controller: _phoneCtrl,
                                      keyboardType: TextInputType.phone,
                                      validator: _validatePhone,
                                      style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                      decoration: InputDecoration(
                                        labelText: 'Phone Number (Optional)',
                                        hintText: '+94 77 123 4567',
                                        prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                    ),

                                    const SizedBox(height: 20),

                                    // Submit Button
                                    SizedBox(
                                      width: double.infinity,
                                      height: 48,
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppTheme.primaryBlue,
                                          foregroundColor: Colors.white,
                                          elevation: 3,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                        ),
                                        onPressed: _loading ? null : _submit,
                                        child: _loading
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                              )
                                            : const Text(
                                                'Create Tourist Account',
                                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                              ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Back to Sign In Link
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Already have a tourist account? ',
                              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                            ),
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Text(
                                'Sign In',
                                style: TextStyle(
                                  color: Color(0xFFFDE68A),
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                  decoration: TextDecoration.underline,
                                  decorationColor: Color(0xFFFDE68A),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),

                        // Business Owner Redirect Notice
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0x22FFFFFF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0x33FFFFFF)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.storefront_rounded, color: Color(0xFFFDE68A), size: 18),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Are you a Hotel, Restaurant, or Tour operator? Please register on the TourMate Web Portal.',
                                  style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, height: 1.3),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
