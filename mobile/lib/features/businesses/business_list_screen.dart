import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import 'booking_countdown_dialog.dart';

class BusinessListScreen extends StatefulWidget {
  final VoidCallback? onNavigateToBookings;
  const BusinessListScreen({super.key, this.onNavigateToBookings});

  @override
  State<BusinessListScreen> createState() => _BusinessListScreenState();
}

class _BusinessListScreenState extends State<BusinessListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _businesses = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadBusinesses();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadBusinesses() async {
    setState(() => _isLoading = true);
    final results = await ApiClient.getBusinesses();
    setState(() {
      _businesses = results;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hotels = _businesses.where((b) => b['type'] == 'Hotel').toList();
    final restaurants = _businesses.where((b) => b['type'] == 'Restaurant').toList();

    return Column(
      children: [
        // Tab Bar Container
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.primaryBlue,
            indicatorWeight: 3,
            labelColor: AppTheme.primaryBlue,
            unselectedLabelColor: AppTheme.textLight,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            tabs: const [
              Tab(icon: Icon(Icons.hotel_rounded, size: 20), text: 'Hotels & Eco-Lodges'),
              Tab(icon: Icon(Icons.restaurant_rounded, size: 20), text: 'Artisan Restaurants'),
            ],
          ),
        ),

        // Component B Academic Badge
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.primaryLight.withOpacity(0.3)),
                ),
                child: const Text(
                  'Component B (Member 2)',
                  style: TextStyle(color: AppTheme.primaryBlue, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              const Text('Accommodation & Dining Discovery', style: TextStyle(color: AppTheme.textMedium, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ),

        // Tab Content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildList(hotels, isHotel: true),
                    _buildList(restaurants, isHotel: false),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildList(List<Map<String, dynamic>> items, {required bool isHotel}) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => _loadBusinesses(),
        color: AppTheme.primaryBlue,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 40),
            Center(
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6FF),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isHotel ? Icons.hotel_rounded : Icons.restaurant_rounded,
                  color: AppTheme.primaryBlue,
                  size: 40,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isHotel ? 'No Approved Hotels Found' : 'No Approved Restaurants Found',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            ),
            const SizedBox(height: 8),
            Text(
              isHotel
                  ? 'Only accommodation listings submitted by verified business owners and approved by administrators appear here.'
                  : 'Only dining listings submitted by verified business owners and approved by administrators appear here.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.4),
            ),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton.icon(
                onPressed: _loadBusinesses,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Refresh Listings'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => _loadBusinesses(),
      color: AppTheme.primaryBlue,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final b = items[index];
          final offer = b['offer'];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            clipBehavior: Clip.antiAlias,
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppTheme.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    Image.network(
                      b['imageUrl'] ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 160,
                        color: AppTheme.backgroundLight,
                        child: const Center(child: Icon(Icons.hotel, color: AppTheme.cardBorder, size: 40)),
                      ),
                    ),
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xDD064E3B),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified_rounded, color: Color(0xFF6EE7B7), size: 12),
                            SizedBox(width: 4),
                            Text(
                              'Admin Approved',
                              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (offer != null)
                      Positioned(
                        top: 36,
                        left: 10,
                        child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.accentGold,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 4),
                          ],
                        ),
                        child: Text(
                          offer,
                          style: const TextStyle(color: Colors.black87, fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.92),
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4),
                        ],
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, color: AppTheme.accentGold, size: 16),
                          const SizedBox(width: 3),
                          Text(
                            '${b['rating'] ?? 4.8}',
                            style: const TextStyle(color: AppTheme.textDark, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      b['name'] ?? '',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '📍 ${b['district']} District',
                      style: const TextStyle(color: AppTheme.primaryBlue, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: (b['amenities'] as List<dynamic>? ?? []).map((amenity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.backgroundLight,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.cardBorder),
                          ),
                          child: Text(
                            amenity.toString(),
                            style: const TextStyle(color: AppTheme.textMedium, fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'From LKR ${b['pricePerNight']} / ${isHotel ? "night" : "person"}',
                          style: const TextStyle(color: AppTheme.textDark, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryBlue,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                          onPressed: () => _openBookingSheet(context, b, isHotel: isHotel),
                          child: Text(isHotel ? 'Select Room' : 'Book Table', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      ),
    );
  }

  void _openBookingSheet(BuildContext context, Map<String, dynamic> b, {required bool isHotel}) async {
    final token = AuthProvider.token ?? await AuthProvider.getToken();
    if (token == null || token.isEmpty) {
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.lock_outline_rounded, color: AppTheme.primaryBlue, size: 24),
              SizedBox(width: 8),
              Text('Tourist Login Required', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            'Please sign in as a tourist to book "${b['name']}". After placing your reservation, you will receive a 1-minute live countdown window to review or cancel at no charge.',
            style: const TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textMedium)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pushNamed('/login');
              },
              child: const Text('Go to Login'),
            ),
          ],
        ),
      );
      return;
    }

    if (!mounted) return;

    final bookingRes = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BookingBottomSheet(business: b, isHotel: isHotel, token: token),
    );

    if (bookingRes == null || !context.mounted) return;

    // Booking created on backend! Now trigger the 1-minute live countdown window
    final bookingId = bookingRes['bookingId']?.toString() ?? '';
    final bookingRef = bookingRes['bookingReference']?.toString() ?? 'TM-${DateTime.now().millisecondsSinceEpoch}';
    final totalAmount = bookingRes['totalAmount']?.toString() ?? '0';

    final wasCancelled = await BookingCountdownDialog.show(
      context,
      bookingId: bookingId,
      bookingReference: bookingRef,
      businessName: b['name']?.toString() ?? 'Reservation',
      isHotel: isHotel,
      totalAmount: totalAmount,
    );

    if (!context.mounted) return;

    if (wasCancelled) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          content: Row(
            children: [
              const Icon(Icons.cancel_outlined, color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Reservation $bookingRef was cancelled. No charges applied.',
                  style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          action: SnackBarAction(
            label: 'View Booking',
            textColor: Colors.white,
            onPressed: () {
              widget.onNavigateToBookings?.call();
            },
          ),
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Reservation $bookingRef placed! Awaiting host confirmation.',
                  style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );

      // Navigate to Bookings tab immediately so tourist can see their booking
      widget.onNavigateToBookings?.call();
    }
  }
}

// ── Interactive Booking Sheet with 1-Minute Grace Window ──────────────────────
class _BookingBottomSheet extends StatefulWidget {
  final Map<String, dynamic> business;
  final bool isHotel;
  final String token;

  const _BookingBottomSheet({
    required this.business,
    required this.isHotel,
    required this.token,
  });

  @override
  State<_BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends State<_BookingBottomSheet> {
  late DateTime _startDate;
  late DateTime _endDate;
  TimeOfDay _diningTime = const TimeOfDay(hour: 19, minute: 0);
  int _guests = 2;
  final _requestsCtrl = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = DateTime(now.year, now.month, now.day + 1);
    _endDate = widget.isHotel
        ? DateTime(now.year, now.month, now.day + 2)
        : DateTime(now.year, now.month, now.day + 1, 21, 0);
  }

  @override
  void dispose() {
    _requestsCtrl.dispose();
    super.dispose();
  }

  String _formatDate(DateTime d) {
    return '${_months[d.month - 1]} ${d.day}, ${d.year}';
  }

  String _formatTime(TimeOfDay t) {
    final hour = t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod;
    final period = t.period == DayPeriod.am ? 'AM' : 'PM';
    final minute = t.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period';
  }

  int get _nights {
    if (!widget.isHotel) return 1;
    final diff = _endDate.difference(_startDate).inDays;
    return math.max(1, diff);
  }

  num get _basePrice {
    final p = widget.business['pricePerNight'];
    if (p is num) return p;
    return num.tryParse(p?.toString() ?? '') ?? (widget.isHotel ? 15000 : 2500);
  }

  num get _totalEst {
    if (widget.isHotel) {
      return _basePrice * _nights * math.max(1, _guests);
    } else {
      return _basePrice * math.max(1, _guests);
    }
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryBlue),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (widget.isHotel && !_endDate.isAfter(_startDate)) {
          _endDate = _startDate.add(const Duration(days: 1));
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate.add(const Duration(days: 1)),
      lastDate: _startDate.add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryBlue),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _endDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _diningTime,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryBlue),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _diningTime = picked);
    }
  }

  Future<void> _submitBooking() async {
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    final String startIso;
    final String endIso;

    if (widget.isHotel) {
      startIso = DateTime(_startDate.year, _startDate.month, _startDate.day, 14, 0).toIso8601String();
      endIso = DateTime(_endDate.year, _endDate.month, _endDate.day, 11, 0).toIso8601String();
    } else {
      final startDt = DateTime(
        _startDate.year,
        _startDate.month,
        _startDate.day,
        _diningTime.hour,
        _diningTime.minute,
      );
      startIso = startDt.toIso8601String();
      endIso = startDt.add(const Duration(hours: 2)).toIso8601String();
    }

    final res = await ApiClient.createBooking(
      token: widget.token,
      businessId: widget.business['id']?.toString() ?? '',
      startDate: startIso,
      endDate: endIso,
      guestsCount: _guests,
      specialRequests: _requestsCtrl.text.trim().isNotEmpty ? _requestsCtrl.text.trim() : null,
    );

    if (!mounted) return;

    if (res['success'] == true) {
      Navigator.of(context).pop(res);
    } else {
      setState(() {
        _submitting = false;
        _errorMessage = res['message'] ?? 'Unable to place reservation. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D5DB),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    widget.isHotel ? Icons.hotel_rounded : Icons.restaurant_rounded,
                    color: AppTheme.primaryBlue,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.isHotel ? 'Reserve Room' : 'Book Dining Table',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      Text(
                        widget.business['name'] ?? '',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMedium),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: AppTheme.textLight),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // Scrollable Content
          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + bottomInset),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Dates Selection
                  Text(
                    widget.isHotel ? 'Select Stay Dates' : 'Reservation Date & Time',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textDark),
                  ),
                  const SizedBox(height: 8),

                  if (widget.isHotel) ...[
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _pickStartDate,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Check-in', style: TextStyle(fontSize: 10, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_today_rounded, size: 14, color: AppTheme.primaryBlue),
                                      const SizedBox(width: 6),
                                      Text(_formatDate(_startDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.arrow_forward_rounded, size: 16, color: AppTheme.textLight),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: _pickEndDate,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Check-out', style: TextStyle(fontSize: 10, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.event_available_rounded, size: 14, color: AppTheme.primaryBlue),
                                      const SizedBox(width: 6),
                                      Text(_formatDate(_endDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text('Duration: $_nights night${_nights > 1 ? "s" : ""}', style: const TextStyle(fontSize: 11, color: AppTheme.primaryBlue, fontWeight: FontWeight.w600)),
                  ] else ...[
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _pickStartDate,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Dining Date', style: TextStyle(fontSize: 10, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_today_rounded, size: 14, color: AppTheme.primaryBlue),
                                      const SizedBox(width: 6),
                                      Text(_formatDate(_startDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: _pickTime,
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Dining Time', style: TextStyle(fontSize: 10, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.primaryBlue),
                                      const SizedBox(width: 6),
                                      Text(_formatTime(_diningTime), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 18),

                  // Guests Counter
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Number of Guests', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textDark)),
                          Text('Adults & children included', style: TextStyle(fontSize: 11, color: AppTheme.textLight)),
                        ],
                      ),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, size: 16),
                              onPressed: _guests > 1 ? () => setState(() => _guests--) : null,
                              visualDensity: VisualDensity.compact,
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              child: Text('$_guests', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, size: 16),
                              onPressed: _guests < 10 ? () => setState(() => _guests++) : null,
                              visualDensity: VisualDensity.compact,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Special Requests
                  const Text('Special Requests (Optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textDark)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _requestsCtrl,
                    maxLines: 2,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textDark),
                    decoration: InputDecoration(
                      hintText: widget.isHotel
                          ? 'e.g. Quiet room, high floor, airport pickup...'
                          : 'e.g. Window table, vegetarian menu, birthday celebration...',
                      hintStyle: const TextStyle(fontSize: 12, color: AppTheme.textLight),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 1-Minute Live Cancellation Banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.timer_outlined, color: Color(0xFFD97706), size: 22),
                        SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Free 1-Minute Live Cancellation Window',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                              ),
                              SizedBox(height: 3),
                              Text(
                                'After placing this booking, a 60-second live countdown dialog lets you review or cancel instantly with zero penalty.',
                                style: TextStyle(fontSize: 11, color: Color(0xFFB45309), height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Total Estimation Box
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Estimated Total', style: TextStyle(fontSize: 11, color: Color(0xFF166534), fontWeight: FontWeight.w600)),
                            Text(
                              widget.isHotel
                                  ? 'LKR $_basePrice x $_nights night(s) x $_guests'
                                  : 'LKR $_basePrice x $_guests guest(s)',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF15803D)),
                            ),
                          ],
                        ),
                        Text(
                          'LKR ${_totalEst.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF15803D)),
                        ),
                      ],
                    ),
                  ),

                  if (_errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626), fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 18),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 2,
                      ),
                      onPressed: _submitting ? null : _submitBooking,
                      child: _submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.lock_clock_outlined, size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  widget.isHotel
                                      ? 'Reserve Room & Start 60s Timer'
                                      : 'Reserve Table & Start 60s Timer',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

