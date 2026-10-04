import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../features/splash/splash_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/explore/explore_screen.dart';
import '../features/businesses/business_list_screen.dart';
import '../features/bookings/bookings_screen.dart';
import '../features/reviews/my_reviews_screen.dart';
import '../features/trips/ai_concierge_sheet.dart';
import '../features/trips/ai_trip_planner_screen.dart';

class TourMateApp extends StatelessWidget {
  const TourMateApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TourMate Sri Lanka',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/splash',
      routes: {
        '/splash':   (_) => const SplashScreen(),
        '/login':    (_) => const LoginScreen(),
        '/register': (_) => const RegisterScreen(),
        '/home':     (_) => const MainScaffold(),
      },
    );
  }
}

// ── Main Scaffold (post-login) ─────────────────────────────────────────────────
class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;
  final GlobalKey<BookingsScreenState> _bookingsKey = GlobalKey<BookingsScreenState>();
  final GlobalKey<MyReviewsScreenState> _reviewsKey = GlobalKey<MyReviewsScreenState>();

  void _onTabTapped(int idx) {
    setState(() => _currentIndex = idx);
    if (idx == 2) {
      // Always fresh-load bookings when the Bookings tab is shown
      _bookingsKey.currentState?.loadBookings();
    } else if (idx == 3) {
      // Always fresh-load reviews when the Reviews tab is shown
      _reviewsKey.currentState?.loadReviews();
    }
  }

  void _navigateToBookings() {
    setState(() => _currentIndex = 2);
    // Give the IndexedStack a single frame to show the bookings widget,
    // then trigger a fresh reload so the new booking appears immediately.
    Future.microtask(() {
      _bookingsKey.currentState?.loadBookings();
    });
  }

  late final List<Widget> _screens = [
    const ExploreScreen(),
    BusinessListScreen(
      onNavigateToBookings: _navigateToBookings,
    ),
    BookingsScreen(
      key: _bookingsKey,
      onExplore: () => _onTabTapped(1),
    ),
    MyReviewsScreen(key: _reviewsKey),
  ];

  final List<_NavItem> _navItems = const [
    _NavItem(icon: Icons.explore_outlined,       activeIcon: Icons.explore_rounded,        label: 'Explore'),
    _NavItem(icon: Icons.hotel_outlined,          activeIcon: Icons.hotel_rounded,           label: 'Stay & Dine'),
    _NavItem(icon: Icons.calendar_month_outlined, activeIcon: Icons.calendar_month_rounded,  label: 'Bookings'),
    _NavItem(icon: Icons.rate_review_outlined,    activeIcon: Icons.rate_review_rounded,     label: 'Reviews'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('TourMate', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1)),
                Text('Sri Lanka Travels', style: TextStyle(fontSize: 10, color: Color(0xFFBFDBFE), fontWeight: FontWeight.w600, letterSpacing: 1.5, height: 1.1)),
              ],
            ),
          ],
        ),
        actions: [
          // Agentic AI Trip Planner Screen
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: AppTheme.accentGold),
            tooltip: 'Agentic AI Trip Planner',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(
                      title: const Text('Agentic AI Trip Planner'),
                    ),
                    body: const SafeArea(child: AITripPlannerScreen()),
                  ),
                ),
              );
            },
          ),
          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white),
            tooltip: 'Sign Out',
            onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      // ── Floating Agentic AI Concierge Button ────────────────────────────────
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryDark,
        elevation: 6,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: BorderSide(color: AppTheme.accentGold.withValues(alpha: 0.8), width: 1.5),
        ),
        icon: Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: AppTheme.accentGold,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryDark, size: 16),
        ),
        label: const Text(
          'AI Concierge',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 13,
            letterSpacing: 0.3,
          ),
        ),
        tooltip: 'Ask Agentic AI Concierge',
        onPressed: () => AIConciergeSheet.show(context),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        items: _navItems.map((n) => BottomNavigationBarItem(
          icon:       Icon(n.icon),
          activeIcon: Icon(n.activeIcon),
          label:      n.label,
        )).toList(),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}
