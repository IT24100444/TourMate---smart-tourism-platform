import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();

  bool _obscure = true;
  bool _loading = false;
  String? _error;

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut),
    );
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic),
    );
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  String? _validateEmail(String? v) {
    if (v == null || v.trim().isEmpty) return 'Email is required';
    final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!regex.hasMatch(v.trim())) return 'Enter a valid email address';
    return null;
  }

  String? _validatePassword(String? v) {
    if (v == null || v.isEmpty) return 'Password is required';
    if (v.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final response = await ApiClient.login(
        _emailCtrl.text.trim(),
        _passCtrl.text,
      ).timeout(const Duration(seconds: 10));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final data = body['data'] ?? body;
        final role = (data['role'] as String? ?? '').toLowerCase();

        // Guard: Mobile app is strictly for tourists only
        if (role != 'tourist' && role != '1') {
          if (!mounted) return;
          setState(() => _loading = false);
          _showRestrictedRoleDialog();
          return;
        }

        final token  = data['token'] as String? ?? '';
        final userId = data['userId']?.toString() ?? data['id']?.toString() ?? '';
        final email  = data['email'] as String? ?? _emailCtrl.text.trim();

        AuthProvider.setSession(token: token, userId: userId, email: email);

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/home');
      } else {
        final msg = body['message'] ?? body['errors']?[0] ?? 'Invalid email or password.';
        setState(() => _error = msg);
      }
    } catch (e) {
      setState(() => _error = 'Cannot connect to backend server. Make sure the TourMate backend is running.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showRestrictedRoleDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.lock_person_rounded, color: AppTheme.primaryBlue, size: 28),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Tourists Only Portal',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: const Text(
          'This mobile app is exclusively designed for Tourists exploring Sri Lanka.\n\n'
          'Business Owners and Platform Administrators must sign in using the TourMate Web Management Portal on your computer or browser.',
          style: TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF4B5563)),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryBlue,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Understood', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background Travel Photography (Sri Lanka Sunset Beach)
          Image.asset(
            'assets/images/auth_bg.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: const Color(0xFF1E3A8A),
            ),
          ),

          // Cinematic Dark Gradient Overlay
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x800F172A), // Top dim
                  Color(0x990A1128), // Middle tint
                  Color(0xF0050B14), // Grounded bottom
                ],
                stops: [0.0, 0.45, 1.0],
              ),
            ),
          ),

          // Safe Area & Phone-Constrained Centered Content
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: SlideTransition(
                    position: _slideAnim,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(height: 12),

                          // Top Branding Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x4D000000),
                                      blurRadius: 14,
                                      offset: Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(14),
                                  child: Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: Image.asset(
                                      'assets/images/logo.png',
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        Icons.travel_explore,
                                        color: AppTheme.primaryBlue,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'TourMate',
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  Text(
                                    'SRI LANKA TRAVELS',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFFFDE68A),
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          const SizedBox(height: 16),

                          // Tourist Only Chip
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
                                Icon(Icons.explore_rounded, color: Color(0xFF93C5FD), size: 14),
                                SizedBox(width: 6),
                                Text(
                                  'TOURIST PORTAL',
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

                          const SizedBox(height: 18),

                          // Frosted Glassmorphism Card
                          ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                              child: Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(240),
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
                                        'Tourist Sign In',
                                        style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF0F172A),
                                          letterSpacing: -0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      const Text(
                                        'Sign in to explore destinations & plan your trip',
                                        style: TextStyle(
                                          color: Color(0xFF64748B),
                                          fontSize: 13,
                                        ),
                                      ),
                                      const SizedBox(height: 18),

                                      // Error Banner
                                      if (_error != null) ...[
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          margin: const EdgeInsets.only(bottom: 16),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEF2F2),
                                            border: Border.all(color: const Color(0xFFFECACA)),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Row(
                                            children: [
                                              const Icon(Icons.info_outline, color: Color(0xFFEF4444), size: 18),
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

                                      // Email Field
                                      TextFormField(
                                        controller: _emailCtrl,
                                        keyboardType: TextInputType.emailAddress,
                                        validator: _validateEmail,
                                        style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                        decoration: InputDecoration(
                                          labelText: 'Email Address',
                                          hintText: 'tourist@example.com',
                                          prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                        ),
                                      ),
                                      const SizedBox(height: 14),

                                      // Password Field
                                      TextFormField(
                                        controller: _passCtrl,
                                        obscureText: _obscure,
                                        validator: _validatePassword,
                                        style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                                        decoration: InputDecoration(
                                          labelText: 'Password',
                                          hintText: 'Enter your password',
                                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                          suffixIcon: IconButton(
                                            icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                                            onPressed: () => setState(() => _obscure = !_obscure),
                                          ),
                                        ),
                                      ),

                                      const SizedBox(height: 22),

                                      // Sign In Button
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
                                              : const Text('Sign In as Tourist', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                                        ),
                                       ),
                                     ],
                                  ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Register Link
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              const Text(
                                "New to TourMate? ",
                                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                              ),
                              GestureDetector(
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const RegisterScreen()),
                                ),
                                child: const Text(
                                  'Create Tourist Account',
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

                          const SizedBox(height: 16),

                          // Business Owner Note
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0x22FFFFFF),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0x33FFFFFF)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline_rounded, color: Color(0xFF93C5FD), size: 16),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Business owners: Please access your dashboard and bookings via the TourMate Web Portal.',
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
          ),
        ],
      ),
    );
  }
}
