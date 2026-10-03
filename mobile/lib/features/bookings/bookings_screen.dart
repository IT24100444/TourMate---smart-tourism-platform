import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../businesses/booking_countdown_dialog.dart';
import '../reviews/my_reviews_screen.dart';

class BookingsScreen extends StatefulWidget {
  final VoidCallback? onExplore;
  const BookingsScreen({super.key, this.onExplore});

  @override
  State<BookingsScreen> createState() => BookingsScreenState();
}

class BookingsScreenState extends State<BookingsScreen> {
  List<Map<String, dynamic>> _bookings = [];
  bool _loading = true;
  bool _isRefreshing = false;
  String? _errorMessage;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    loadBookings();
    // Auto-refresh every 30 seconds to pick up status changes from the business owner smoothly
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) loadBookings(silent: true);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  /// Load bookings from backend. If [silent] is true, don't show any progress indicator.
  Future<void> loadBookings({bool silent = false}) async {
    if (_bookings.isEmpty) {
      if (!silent) setState(() { _loading = true; _errorMessage = null; });
    } else {
      if (!silent) setState(() { _isRefreshing = true; _errorMessage = null; });
    }

    final token = await AuthProvider.getToken() ?? '';
    final result = await ApiClient.getMyBookingsResult(token: token);

    if (mounted) {
      setState(() {
        _loading = false;
        _isRefreshing = false;
        if (result['success'] == true) {
          _bookings = result['items'] as List<Map<String, dynamic>>;
          _errorMessage = null;
        } else {
          // Keep existing bookings visible on silent or background refresh failure
          if (_bookings.isEmpty) {
            _errorMessage = result['error']?.toString();
          }
        }
      });
    }
  }

  String _formatDates(Map<String, dynamic> b) {
    if (b['dates'] != null && b['dates'].toString().isNotEmpty) {
      return b['dates'].toString();
    }
    try {
      final startStr = b['startDate']?.toString();
      final endStr = b['endDate']?.toString();
      if (startStr != null && startStr.isNotEmpty) {
        final start = DateTime.parse(startStr).toLocal();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final startFormatted = '${months[start.month - 1]} ${start.day}, ${start.year}';
        if (endStr != null && endStr.isNotEmpty) {
          final end = DateTime.parse(endStr).toLocal();
          final endFormatted = '${months[end.month - 1]} ${end.day}, ${end.year}';
          if (startFormatted == endFormatted) {
            final timeStr = '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}';
            return '$startFormatted • $timeStr';
          }
          final nights = end.difference(start).inDays;
          final nightStr = nights > 0 ? ' ($nights Night${nights > 1 ? 's' : ''})' : '';
          return '$startFormatted - $endFormatted$nightStr';
        }
        return startFormatted;
      }
    } catch (_) {}
    return '';
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return const Color(0xFF10B981);
      case 'completed':
        return const Color(0xFF2563EB);
      case 'rejected':
      case 'cancelled':
        return const Color(0xFFEF4444);
      case 'expired':
        return const Color(0xFFEA580C);
      case 'pending':
      default:
        return const Color(0xFFD97706);
    }
  }

  void _handleResend(Map<String, dynamic> b) async {
    // Launch 1-minute countdown dialog to allow tourist to review/cancel
    final cancelled = await BookingCountdownDialog.show(
      context,
      bookingId: b['id'] ?? '',
      bookingReference: b['ref'] ?? '',
      businessName: b['businessName'] ?? '',
      isHotel: b['businessType'] == 1,
      totalAmount: b['amount'] ?? '',
    );

    if (!cancelled) {
      final token = await AuthProvider.getToken() ?? '';
      final ok = await ApiClient.resendBooking(
        token: token,
        bookingId: b['id'] ?? '',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ok
                ? 'Booking request re-sent to host! Awaiting response within 24h.'
                : 'Booking re-sent locally. Host has been notified.'),
            backgroundColor: AppTheme.primaryDark,
          ),
        );
        loadBookings();
      }
    }
  }

  void _showComplainDialog(Map<String, dynamic> b) {
    final complaintCtrl = TextEditingController(
      text: 'The host did not respond or confirm my booking within 24 hours.',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.report_problem_rounded, color: Color(0xFFDC2626), size: 24),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Report Issue: ${b['businessName']}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your complaint will be escalated directly to TourMate Administration for official review and host disciplinary warning:',
              style: TextStyle(fontSize: 12, color: AppTheme.textMedium, height: 1.4),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: complaintCtrl,
              maxLines: 4,
              style: const TextStyle(fontSize: 13, color: AppTheme.textDark),
              decoration: InputDecoration(
                hintText: 'Describe the issue...',
                hintStyle: const TextStyle(color: AppTheme.textLight, fontSize: 12),
                filled: true,
                fillColor: AppTheme.backgroundLight,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textLight)),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final token = await AuthProvider.getToken() ?? '';
              final ok = await ApiClient.submitComplaint(
                token: token,
                bookingId: b['id'] ?? '',
                complaintText: complaintCtrl.text.trim(),
              );

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok
                        ? 'Complaint escalated to TourMate Administration.'
                        : 'Complaint registered. TourMate team will review this host.'),
                    backgroundColor: const Color(0xFFDC2626),
                  ),
                );
                loadBookings();
              }
            },
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Submit Complaint', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showReviewDialog(String bookingId, String businessName) {
    int rating = 5;
    final textController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Review $businessName',
            style: const TextStyle(fontSize: 16, color: AppTheme.textDark, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Rate your completed experience:', style: TextStyle(color: AppTheme.textMedium, fontSize: 13)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  return IconButton(
                    icon: Icon(
                      i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppTheme.accentGold,
                      size: 30,
                    ),
                    onPressed: () => setDlgState(() => rating = i + 1),
                  );
                }),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: textController,
                maxLines: 3,
                style: const TextStyle(color: AppTheme.textDark, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Share highlights of your stay/visit...',
                  hintStyle: const TextStyle(color: AppTheme.textLight, fontSize: 12),
                  filled: true,
                  fillColor: AppTheme.backgroundLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textLight)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isSubmitting ? null : () async {
                final comment = textController.text.trim();
                if (comment.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please write a short comment about your stay.'),
                      backgroundColor: Colors.amber,
                    ),
                  );
                  return;
                }

                setDlgState(() => isSubmitting = true);
                final messenger = ScaffoldMessenger.of(context);
                final token = await AuthProvider.getToken() ?? '';
                final res = await ApiClient.submitBookingReview(
                  token: token,
                  bookingId: bookingId,
                  rating: rating,
                  comment: comment,
                );

                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  if (res['success'] == true) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Review submitted to property host! View in Reviews tab. ⭐'),
                        backgroundColor: AppTheme.primaryDark,
                      ),
                    );
                    loadBookings();
                    ReviewsRefreshNotifier.notifyChanged();
                  } else {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text(res['error']?.toString() ?? 'Failed to submit review.'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: Text(isSubmitting ? 'Submitting...' : 'Submit Review', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => loadBookings(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.3)),
                    ),
                    child: const Text(
                      'Tourist Portal',
                      style: TextStyle(color: AppTheme.primaryBlue, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text('My Bookings & Reservations',
                      style: TextStyle(color: AppTheme.textMedium, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
              IconButton(
                onPressed: () => loadBookings(),
                icon: _isRefreshing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryBlue),
                      )
                    : const Icon(Icons.refresh, color: AppTheme.primaryBlue, size: 20),
                tooltip: 'Refresh',
              ),
            ],
          ),
          if (_isRefreshing) ...[
            const SizedBox(height: 6),
            const ClipRRect(
              borderRadius: BorderRadius.all(Radius.circular(2)),
              child: LinearProgressIndicator(
                minHeight: 2.5,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
              ),
            ),
          ],
          const SizedBox(height: 12),

          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(48),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_errorMessage != null)
            // ── Error State ────────────────────────────────────────────────────
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF2F2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.wifi_off_rounded, size: 38, color: Color(0xFFDC2626)),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Could Not Load Bookings',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.5),
                    ),
                    const SizedBox(height: 22),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                      onPressed: () => loadBookings(),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            )
          else if (_bookings.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.bookmark_border_rounded, size: 38, color: AppTheme.primaryBlue),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'No Bookings Yet',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'You have not placed any reservations yet. When you book a hotel or restaurant, your reservation and live approval status will appear here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.5),
                    ),
                    if (widget.onExplore != null) ...[
                      const SizedBox(height: 22),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        onPressed: widget.onExplore,
                        icon: const Icon(Icons.hotel_rounded, size: 18),
                        label: const Text('Browse Hotels & Dining', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            ..._bookings.map((b) {
              final status = (b['status'] ?? 'Pending').toString();
              final Color statusColor = _getStatusColor(status);
              final isPending = status.toLowerCase() == 'pending';
              final isConfirmed = status.toLowerCase() == 'confirmed' || status.toLowerCase() == 'approved';
              final isCompleted = status.toLowerCase() == 'completed';
              final isRejected = status.toLowerCase() == 'rejected' || status.toLowerCase() == 'cancelled';
              final isExpired = status.toLowerCase() == 'expired' || b['isExpired'] == true;
              final hasComplaint = b['hasComplaint'] == true;
              final cancellationReason = b['cancellationReason']?.toString();
              final dateText = _formatDates(b);

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isExpired
                        ? const Color(0xFFFDBA74)
                        : (isRejected ? const Color(0xFFFCA5A5) : AppTheme.cardBorder),
                    width: (isExpired || isRejected) ? 1.5 : 1,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Ref & Status Chip
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            b['ref'] ?? '',
                            style: const TextStyle(color: AppTheme.primaryBlue, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (isConfirmed) ...[
                                  const Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF10B981)),
                                  const SizedBox(width: 4),
                                ] else if (isPending) ...[
                                  const Icon(Icons.hourglass_top_rounded, size: 13, color: Color(0xFFD97706)),
                                  const SizedBox(width: 4),
                                ] else if (isExpired) ...[
                                  const Icon(Icons.timer_off_outlined, size: 13, color: Color(0xFFEA580C)),
                                  const SizedBox(width: 4),
                                ] else if (isRejected) ...[
                                  const Icon(Icons.cancel_rounded, size: 13, color: Color(0xFFEF4444)),
                                  const SizedBox(width: 4),
                                ],
                                Text(
                                  isPending ? 'Pending Confirmation' : (isConfirmed ? 'Confirmed' : status),
                                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      Text(
                        b['businessName'] ?? 'Property Host',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 6),

                      if (dateText.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 14, color: AppTheme.textLight),
                            const SizedBox(width: 6),
                            Text(dateText, style: const TextStyle(color: AppTheme.textMedium, fontSize: 12, fontWeight: FontWeight.w500)),
                          ],
                        ),
                        const SizedBox(height: 4),
                      ],

                      Row(
                        children: [
                          const Icon(Icons.people_alt_outlined, size: 14, color: AppTheme.textLight),
                          const SizedBox(width: 6),
                          Text('${b['guestsCount'] ?? 2} Guests • ${b['amount'] ?? ''}',
                              style: const TextStyle(color: AppTheme.textDark, fontSize: 13, fontWeight: FontWeight.bold)),
                        ],
                      ),

                      // Pending explanation banner
                      if (isPending) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFEF3C7)),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.schedule_rounded, color: Color(0xFFD97706), size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Reservation submitted. Awaiting property host confirmation (within 24 hours).',
                                  style: TextStyle(color: Color(0xFF92400E), fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Confirmed banner
                      if (isConfirmed) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFDCFCE7)),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.verified_rounded, color: Color(0xFF16A34A), size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Confirmed by host! Your reservation is officially approved and secured.',
                                  style: TextStyle(color: Color(0xFF166534), fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Rejection or Expiration reason banner
                      if (isRejected && cancellationReason != null && cancellationReason.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFEE2E2)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.info_outline, color: Color(0xFFDC2626), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Declined by Host: $cancellationReason',
                                  style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      if (isExpired) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFFEDD5)),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.timer_off_outlined, color: Color(0xFFEA580C), size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Booking auto-expired: Property host did not confirm within the 24-hour response window.',
                                  style: TextStyle(color: Color(0xFF9A3412), fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      if (hasComplaint) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFECACA)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.shield_outlined, color: Color(0xFFDC2626), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  b['complaintText'] != null && b['complaintText'].toString().isNotEmpty
                                      ? 'Complaint filed to Admin: "${b['complaintText']}". Under official review.'
                                      : 'Complaint filed to TourMate Administration. Under official review.',
                                  style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const Divider(color: AppTheme.cardBorder, height: 24),

                      // Bottom actions
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isPending
                                ? 'Awaiting Host Confirmation'
                                : (isConfirmed
                                    ? 'Confirmed by Host'
                                    : (isCompleted
                                        ? 'Transaction Settled'
                                        : (hasComplaint
                                            ? 'Complaint Under Review'
                                            : (isExpired ? 'Host Unresponsive' : 'Booking Closed')))),
                            style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                          ),

                          // If completed: review button
                          if (isCompleted)
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppTheme.primaryBlue,
                                side: const BorderSide(color: AppTheme.primaryBlue),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              onPressed: () => _showReviewDialog(b['id'], b['businessName']),
                              icon: const Icon(Icons.rate_review_outlined, size: 15, color: AppTheme.accentGold),
                              label: const Text('Write Review', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            )

                          // If expired: Re-send and Complain buttons!
                          else if (isExpired)
                            Row(
                              children: [
                                if (hasComplaint)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFFCA5A5)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFFDC2626)),
                                        SizedBox(width: 4),
                                        Text('Complained', style: TextStyle(color: Color(0xFFDC2626), fontSize: 11, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  )
                                else
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFFDC2626),
                                      side: const BorderSide(color: Color(0xFFFCA5A5)),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    ),
                                    onPressed: () => _showComplainDialog(b),
                                    icon: const Icon(Icons.report_gmailerrorred_rounded, size: 14),
                                    label: const Text('Complain', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryBlue,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  ),
                                  onPressed: () => _handleResend(b),
                                  icon: const Icon(Icons.replay_rounded, size: 14),
                                  label: const Text('Re-send', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            )

                          // If pending: policy button
                          else if (isPending)
                            TextButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Host has 24 hours to confirm. Refundable up to 48 hrs.'),
                                    backgroundColor: AppTheme.primaryDark,
                                  ),
                                );
                              },
                              child: const Text('View Policy', style: TextStyle(color: AppTheme.primaryBlue, fontSize: 12, fontWeight: FontWeight.w600)),
                            )
                          else if (isRejected)
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.primaryBlue,
                                side: const BorderSide(color: AppTheme.primaryBlue),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              onPressed: () => _handleResend(b),
                              icon: const Icon(Icons.replay_rounded, size: 14),
                              label: const Text('Re-book', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
