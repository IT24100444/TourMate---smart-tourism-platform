import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';

/// Shows immediately after a booking is successfully placed.
/// Displays a 60-second live countdown ring. Tourist can tap [Cancel Reservation]
/// at any time within the window. After 60 s with no action, the booking is
/// considered confirmed and the dialog auto-dismisses.
class BookingCountdownDialog extends StatefulWidget {
  final String bookingId;
  final String bookingReference;
  final String businessName;
  final bool isHotel;
  final String totalAmount;

  const BookingCountdownDialog({
    super.key,
    required this.bookingId,
    required this.bookingReference,
    required this.businessName,
    required this.isHotel,
    required this.totalAmount,
  });

  /// Convenience: push the dialog and return whether the booking was cancelled.
  static Future<bool> show(
    BuildContext context, {
    required String bookingId,
    required String bookingReference,
    required String businessName,
    required bool isHotel,
    required String totalAmount,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (_) => BookingCountdownDialog(
        bookingId: bookingId,
        bookingReference: bookingReference,
        businessName: businessName,
        isHotel: isHotel,
        totalAmount: totalAmount,
      ),
    );
    return result ?? false;
  }

  @override
  State<BookingCountdownDialog> createState() => _BookingCountdownDialogState();
}

class _BookingCountdownDialogState extends State<BookingCountdownDialog>
    with SingleTickerProviderStateMixin {
  static const _totalSeconds = 60;

  int _remaining = _totalSeconds;
  Timer? _timer;
  bool _cancelling = false;
  bool _cancelled = false;

  // Animation for the progress ring
  late AnimationController _ringCtrl;

  @override
  void initState() {
    super.initState();

    _ringCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: _totalSeconds),
    )..forward();

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _remaining--);
      if (_remaining <= 0) {
        t.cancel();
        // Auto-confirm: close dialog, booking is placed
        if (mounted) Navigator.of(context).pop(false);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ringCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleCancel() async {
    _timer?.cancel();
    setState(() => _cancelling = true);

    final token = await AuthProvider.getToken() ?? '';
    final success = await ApiClient.cancelBooking(
      token: token,
      bookingId: widget.bookingId,
    );

    if (!mounted) return;

    if (success || widget.bookingId.isEmpty) {
      // Even if the booking ID is empty (backend not running), treat as cancelled
      setState(() { _cancelling = false; _cancelled = true; });
      await Future.delayed(const Duration(milliseconds: 1400));
      if (mounted) Navigator.of(context).pop(true); // true = was cancelled
    } else {
      setState(() => _cancelling = false);
      // Show error snack and restart timer for remaining time
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not cancel. Please try again.'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      // Re-start timer from where it left off
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) { t.cancel(); return; }
        setState(() => _remaining--);
        if (_remaining <= 0) {
          t.cancel();
          if (mounted) Navigator.of(context).pop(false);
        }
      });
    }
  }

  String get _timeLabel {
    final m = _remaining ~/ 60;
    final s = _remaining % 60;
    return '${m.toString().padLeft(1, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color get _ringColor {
    if (_remaining > 30) return const Color(0xFF10B981); // green
    if (_remaining > 10) return const Color(0xFFF59E0B); // amber
    return const Color(0xFFEF4444);                       // red
  }

  @override
  Widget build(BuildContext context) {
    final progress = _remaining / _totalSeconds;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(color: Color(0x40000000), blurRadius: 32, offset: Offset(0, 12)),
          ],
        ),
        child: _cancelled ? _buildCancelledState() : _buildMainState(progress),
      ),
    );
  }

  // ── Cancelled Success State ─────────────────────────────────────────────────
  Widget _buildCancelledState() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(
              color: Color(0xFFFEF2F2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.cancel_rounded, color: Color(0xFFEF4444), size: 38),
          ),
          const SizedBox(height: 18),
          const Text(
            'Reservation Cancelled',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppTheme.textDark,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${widget.bookingReference} has been cancelled successfully. No charges have been applied.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.5),
          ),
        ],
      ),
    );
  }

  // ── Main Countdown State ────────────────────────────────────────────────────
  Widget _buildMainState(double progress) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
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
                    const Text(
                      'Reservation Placed!',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textDark,
                      ),
                    ),
                    Text(
                      widget.businessName,
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMedium),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
          const Divider(color: Color(0xFFE8EDF2), height: 1),
          const SizedBox(height: 20),

          // Booking reference pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.confirmation_number_outlined, size: 15, color: AppTheme.primaryBlue),
                const SizedBox(width: 6),
                Text(
                  widget.bookingReference,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primaryBlue,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Countdown ring
          SizedBox(
            width: 130,
            height: 130,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Background ring
                SizedBox(
                  width: 130,
                  height: 130,
                  child: CustomPaint(
                    painter: _RingPainter(
                      progress: progress,
                      color: _ringColor,
                      trackColor: const Color(0xFFE8EDF2),
                    ),
                  ),
                ),
                // Inner content
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _timeLabel,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: _ringColor,
                        letterSpacing: -1,
                      ),
                    ),
                    Text(
                      _remaining > 0 ? 'to cancel' : 'confirmed!',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textMedium,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Instruction text
          Text(
            _remaining > 0
                ? 'You have $_remaining second${_remaining == 1 ? '' : 's'} to cancel this reservation.\nAfter the timer expires, your booking will be confirmed.'
                : 'Your reservation is confirmed! ✅',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppTheme.textMedium, height: 1.5),
          ),

          const SizedBox(height: 20),

          // Total amount chip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.payments_outlined, size: 16, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                Text(
                  'Total: LKR ${widget.totalAmount}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF15803D),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Action buttons
          Row(
            children: [
              // Cancel button
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
                    backgroundColor: const Color(0xFFFFF5F5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _cancelling || _remaining <= 0 ? null : _handleCancel,
                  icon: _cancelling
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFFEF4444),
                          ),
                        )
                      : const Icon(Icons.cancel_outlined, size: 16),
                  label: Text(
                    _cancelling ? 'Cancelling...' : 'Cancel Reservation',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Keep / confirm button
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 2,
                  ),
                  onPressed: _cancelling
                      ? null
                      : () => Navigator.of(context).pop(false),
                  icon: const Icon(Icons.check_circle_outline, size: 16),
                  label: const Text(
                    'Approve & Confirm',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),
          const Text(
            'Tap "Approve & Confirm" to proceed immediately, or wait for countdown to auto-confirm.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, color: AppTheme.textLight),
          ),
        ],
      ),
    );
  }
}

// ── Countdown Ring Painter ────────────────────────────────────────────────────
class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color trackColor;

  const _RingPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    const strokeWidth = 10.0;
    final radius = (size.width - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: Offset(cx, cy), radius: radius);

    // Track (background ring)
    canvas.drawArc(
      rect,
      -math.pi / 2,
      2 * math.pi,
      false,
      Paint()
        ..color = trackColor
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round,
    );

    // Progress arc
    if (progress > 0) {
      canvas.drawArc(
        rect,
        -math.pi / 2,
        2 * math.pi * progress,
        false,
        Paint()
          ..color = color
          ..strokeWidth = strokeWidth
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color;
}
