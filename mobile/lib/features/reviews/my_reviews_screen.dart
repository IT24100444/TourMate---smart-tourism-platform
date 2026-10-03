import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';

class ReviewsRefreshNotifier {
  static final ValueNotifier<int> trigger = ValueNotifier<int>(0);
  static void notifyChanged() {
    trigger.value++;
  }
}

class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key});

  @override
  State<MyReviewsScreen> createState() => MyReviewsScreenState();
}

class MyReviewsScreenState extends State<MyReviewsScreen> with SingleTickerProviderStateMixin {
  List<Map<String, dynamic>> _reviews = [];
  bool _loading = true;
  String? _error;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    ReviewsRefreshNotifier.trigger.addListener(loadReviews);
    loadReviews();
  }

  @override
  void dispose() {
    ReviewsRefreshNotifier.trigger.removeListener(loadReviews);
    _tabController.dispose();
    super.dispose();
  }

  Future<void> loadReviews() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final token = await AuthProvider.getToken() ?? '';
    if (token.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Please sign in to view your reviews.';
        });
      }
      return;
    }

    final items = await ApiClient.getMyReviews(token: token);
    if (mounted) {
      setState(() {
        _reviews = items;
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _bookingReviews => _reviews.where((r) {
        final targetType = (r['targetType']?.toString() ?? 'Business').toLowerCase();
        return targetType == 'business' || r['bookingId'] != null;
      }).toList();

  List<Map<String, dynamic>> get _placeReviews => _reviews.where((r) {
        final targetType = (r['targetType']?.toString() ?? '').toLowerCase();
        return targetType == 'place' && r['bookingId'] == null;
      }).toList();

  void _showEditDialog(Map<String, dynamic> r, {required bool isPlace}) {
    int rating = (r['rating'] as num?)?.toInt() ?? 5;
    final textController = TextEditingController(text: r['comment']?.toString() ?? '');
    bool isSubmitting = false;
    final titleName = r['businessName'] ?? (isPlace ? 'Attraction' : 'Property');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Text(
            'Edit Review: $titleName',
            style: const TextStyle(fontSize: 16, color: AppTheme.textDark, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Update your rating & thoughts:', style: TextStyle(color: AppTheme.textMedium, fontSize: 13)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  return IconButton(
                    icon: Icon(
                      i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppTheme.accentGold,
                      size: 32,
                    ),
                    onPressed: () => setDlgState(() => rating = i + 1),
                  );
                }),
              ),
              Center(
                child: Text(
                  '$rating.0 / 5.0 Stars',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: textController,
                maxLines: 3,
                style: const TextStyle(color: AppTheme.textDark, fontSize: 13),
                decoration: InputDecoration(
                  hintText: isPlace
                      ? 'Share your experience at this tourist attraction...'
                      : 'Share highlights of your stay/visit...',
                  filled: true,
                  fillColor: AppTheme.backgroundLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.cardBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.cardBorder)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final comment = textController.text.trim();
                      if (comment.isEmpty) return;

                      setDlgState(() => isSubmitting = true);
                      final messenger = ScaffoldMessenger.of(context);
                      final token = await AuthProvider.getToken() ?? '';
                      final ok = await ApiClient.updateReview(
                        token: token,
                        reviewId: r['id'],
                        rating: rating,
                        comment: comment,
                      );

                      if (ctx.mounted) Navigator.pop(ctx);
                      if (mounted) {
                        if (ok) {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Review updated successfully! ✅'),
                              backgroundColor: AppTheme.primaryDark,
                            ),
                          );
                          loadReviews();
                          ReviewsRefreshNotifier.notifyChanged();
                        } else {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Failed to update review.'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
              child: Text(isSubmitting ? 'Saving...' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(Map<String, dynamic> r, {required bool isPlace}) {
    final titleName = r['businessName'] ?? (isPlace ? 'Attraction' : 'Property');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Review?', style: TextStyle(color: AppTheme.textDark, fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
          'Are you sure you want to delete your review for "$titleName"? This action cannot be undone.',
          style: const TextStyle(color: AppTheme.textMedium, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final token = await AuthProvider.getToken() ?? '';
              final ok = await ApiClient.deleteReview(token: token, reviewId: r['id']);
              if (mounted) {
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Review deleted.'), backgroundColor: AppTheme.primaryDark),
                  );
                  loadReviews();
                  ReviewsRefreshNotifier.notifyChanged();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete review.'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: Column(
        children: [
          // ── Top Gradient Header Banner ──────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.rate_review_rounded, color: AppTheme.accentGold, size: 14),
                            SizedBox(width: 6),
                            Text(
                              'My Travel Reviews',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Tourist Reviews & Ratings',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Manage your verified post-stay feedback and destination reviews in Sri Lanka.',
                    style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 12),
                  ),
                  const SizedBox(height: 14),

                  // ── Segmented Two-Division TabBar ─────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      labelColor: AppTheme.primaryDark,
                      unselectedLabelColor: Colors.white70,
                      labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                      tabs: [
                        Tab(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.hotel_rounded, size: 16),
                              const SizedBox(width: 6),
                              Text('Booking Reviews (${_bookingReviews.length})'),
                            ],
                          ),
                        ),
                        Tab(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.place_rounded, size: 16),
                              const SizedBox(width: 6),
                              Text('Places Reviews (${_placeReviews.length})'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── TabBarView Content ──────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.red),
                              const SizedBox(height: 12),
                              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textMedium)),
                              const SizedBox(height: 16),
                              ElevatedButton(onPressed: loadReviews, child: const Text('Retry')),
                            ],
                          ),
                        ),
                      )
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          // Tab 1: Booking Reviews
                          RefreshIndicator(
                            onRefresh: loadReviews,
                            child: _buildBookingReviewsList(),
                          ),

                          // Tab 2: Places Reviews
                          RefreshIndicator(
                            onRefresh: loadReviews,
                            child: _buildPlacesReviewsList(),
                          ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  // ── Tab 1: Booking Reviews List ───────────────────────────────────────────
  Widget _buildBookingReviewsList() {
    final list = _bookingReviews;
    if (list.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(32),
        children: [
          const SizedBox(height: 40),
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.hotel_outlined, size: 40, color: AppTheme.primaryBlue),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'No Booking Reviews Yet',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text(
              'When your hotel or dining reservation is completed, you can submit a verified review and receive host reactions here.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textMedium, fontSize: 12.5, height: 1.4),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, idx) {
        final r = list[idx];
        final isDeletedByOwner = r['isDeletedByOwner'] == true;
        final isHearted = r['isHeartedByOwner'] == true;
        final ownerReply = r['ownerReply']?.toString();
        final int rating = (r['rating'] as num?)?.toInt() ?? 5;
        final bookingRef = r['bookingReference']?.toString();

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDeletedByOwner ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Property Name & Booking Ref
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.business_rounded, color: AppTheme.primaryBlue, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['businessName'] ?? 'Hotel / Restaurant',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textDark),
                          ),
                          if (bookingRef != null && bookingRef.isNotEmpty)
                            Text(
                              'Booking Ref: $bookingRef',
                              style: const TextStyle(color: AppTheme.textLight, fontSize: 11, fontFamily: 'monospace'),
                            ),
                        ],
                      ),
                    ),
                    // Star Rating
                    Row(
                      children: List.generate(5, (i) {
                        return Icon(
                          i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                          color: AppTheme.accentGold,
                          size: 18,
                        );
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Tourist's Review Comment
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    '"${r['comment']}"',
                    style: const TextStyle(color: AppTheme.textDark, fontSize: 13, height: 1.4),
                  ),
                ),
                const SizedBox(height: 10),

                // Host Creator Heart Badge
                if (isHearted && !isDeletedByOwner) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.favorite_rounded, color: Color(0xFFE11D48), size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Loved by Property Host ❤️',
                          style: TextStyle(
                            color: Color(0xFFBE123C),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],

                // Official Host Reply Card
                if (ownerReply != null && ownerReply.isNotEmpty && !isDeletedByOwner) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.reply_rounded, color: AppTheme.primaryBlue, size: 16),
                            SizedBox(width: 6),
                            Text(
                              'Official Host Response:',
                              style: TextStyle(
                                color: AppTheme.primaryBlue,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '"$ownerReply"',
                          style: const TextStyle(
                            color: Color(0xFF1E3A8A),
                            fontSize: 12,
                            height: 1.3,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],

                // Host Deletion Notice Banner
                if (isDeletedByOwner) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, color: Color(0xFFDC2626), size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Business owner deleted your review',
                                style: TextStyle(
                                  color: Color(0xFF991B1B),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'This review has been removed from public listings by the property host.',
                                style: TextStyle(
                                  color: Color(0xFFB91C1C),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],

                // Bottom Row: Date & Tourist Actions (Edit/Delete)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      r['createdAt'] != null && r['createdAt'].toString().isNotEmpty
                          ? 'Submitted ${r['createdAt'].toString().substring(0, 10)}'
                          : '',
                      style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                    ),
                    if (!isDeletedByOwner)
                      Row(
                        children: [
                          TextButton.icon(
                            onPressed: () => _showEditDialog(r, isPlace: false),
                            icon: const Icon(Icons.edit_outlined, size: 14, color: AppTheme.primaryBlue),
                            label: const Text('Edit', style: TextStyle(fontSize: 12, color: AppTheme.primaryBlue, fontWeight: FontWeight.bold)),
                          ),
                          TextButton.icon(
                            onPressed: () => _confirmDelete(r, isPlace: false),
                            icon: const Icon(Icons.delete_outline, size: 14, color: Colors.red),
                            label: const Text('Delete', style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Tab 2: Places Reviews List ────────────────────────────────────────────
  Widget _buildPlacesReviewsList() {
    final list = _placeReviews;
    if (list.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(32),
        children: [
          const SizedBox(height: 40),
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFF059669).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.place_outlined, size: 40, color: Color(0xFF059669)),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'No Places Reviews Yet',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text(
              'Explore Sri Lanka\'s famous heritage spots, waterfalls, and wildlife sanctuaries in the Explore tab and write reviews to guide fellow travelers!',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textMedium, fontSize: 12.5, height: 1.4),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, idx) {
        final r = list[idx];
        final int rating = (r['rating'] as num?)?.toInt() ?? 5;
        final placeName = r['businessName'] ?? 'Tourism Attraction';

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Attraction Badge & Rating Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFF059669).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.place_rounded, color: Color(0xFF059669), size: 22),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            placeName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textDark),
                          ),
                          Container(
                            margin: const EdgeInsets.only(top: 2),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: const Text(
                              'Tourism Place Review',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: List.generate(5, (i) {
                        return Icon(
                          i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                          color: AppTheme.accentGold,
                          size: 18,
                        );
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Review Comment
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    '"${r['comment']}"',
                    style: const TextStyle(color: AppTheme.textDark, fontSize: 13, height: 1.4),
                  ),
                ),
                const SizedBox(height: 12),

                // Bottom Row: Date & Edit/Delete Actions for Place Review
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      r['createdAt'] != null && r['createdAt'].toString().isNotEmpty
                          ? 'Reviewed on ${r['createdAt'].toString().substring(0, 10)}'
                          : '',
                      style: const TextStyle(color: AppTheme.textLight, fontSize: 11),
                    ),
                    Row(
                      children: [
                        TextButton.icon(
                          onPressed: () => _showEditDialog(r, isPlace: true),
                          icon: const Icon(Icons.edit_outlined, size: 14, color: AppTheme.primaryBlue),
                          label: const Text('Edit', style: TextStyle(fontSize: 12, color: AppTheme.primaryBlue, fontWeight: FontWeight.bold)),
                        ),
                        TextButton.icon(
                          onPressed: () => _confirmDelete(r, isPlace: true),
                          icon: const Icon(Icons.delete_outline, size: 14, color: Colors.red),
                          label: const Text('Delete', style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
