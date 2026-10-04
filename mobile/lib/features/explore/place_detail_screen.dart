import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';
import '../reviews/my_reviews_screen.dart';
import '../trips/ai_trip_planner_screen.dart';

class PlaceDetailScreen extends StatefulWidget {
  final Map<String, dynamic> place;

  const PlaceDetailScreen({super.key, required this.place});

  @override
  State<PlaceDetailScreen> createState() => _PlaceDetailScreenState();
}

class _PlaceDetailScreenState extends State<PlaceDetailScreen> {
  List<Map<String, dynamic>> _reviews = [];
  bool _loadingReviews = true;
  double _currentRating = 4.9;
  int _reviewCount = 0;

  @override
  void initState() {
    super.initState();
    _currentRating = (widget.place['rating'] as num?)?.toDouble() ?? 4.9;
    _reviewCount = (widget.place['reviewCount'] as num?)?.toInt() ?? 0;
    _fetchReviews();
  }

  Future<void> _fetchReviews() async {
    final placeId = widget.place['id']?.toString() ?? '';
    if (placeId.isEmpty) {
      setState(() => _loadingReviews = false);
      return;
    }

    final items = await ApiClient.getPlaceReviews(placeId);
    if (mounted) {
      setState(() {
        _reviews = items;
        _loadingReviews = false;
        if (items.isNotEmpty) {
          _reviewCount = items.length;
          final sum = items.fold<num>(0, (prev, r) => prev + ((r['rating'] as num?) ?? 5));
          _currentRating = double.parse((sum / items.length).toStringAsFixed(1));
        }
      });
    }
  }

  void _showWriteReviewDialog() {
    final token = AuthProvider.token ?? '';
    if (token.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in as a tourist to review this attraction.'),
          backgroundColor: AppTheme.primaryDark,
        ),
      );
      return;
    }

    final placeId = widget.place['id']?.toString() ?? '';
    final placeName = widget.place['name'] ?? 'Attraction';
    int rating = 5;
    final commentController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accentGold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.star_rounded, color: AppTheme.accentGold, size: 24),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Review $placeName',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                    ),
                    const Text(
                      'Share your travel experience',
                      style: TextStyle(fontSize: 11, color: AppTheme.textLight),
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your Overall Rating:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textDark),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    return IconButton(
                      icon: Icon(
                        i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                        color: AppTheme.accentGold,
                        size: 36,
                      ),
                      onPressed: () => setDlgState(() => rating = i + 1),
                    );
                  }),
                ),
                Center(
                  child: Text(
                    '$rating.0 / 5.0 Star${rating > 1 ? 's' : ''}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Your Thoughts & Highlights:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textDark),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: commentController,
                  maxLines: 4,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textDark),
                  decoration: InputDecoration(
                    hintText: 'Describe scenery, tips for fellow tourists, best time to visit...',
                    hintStyle: const TextStyle(color: AppTheme.textLight, fontSize: 12),
                    filled: true,
                    fillColor: AppTheme.backgroundLight,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.blue.shade100),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: AppTheme.primaryBlue),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your review will appear in your Reviews tab and can be edited or deleted anytime.',
                          style: TextStyle(fontSize: 10.5, color: AppTheme.primaryBlue, height: 1.3),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final comment = commentController.text.trim();
                      if (comment.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please enter your review comments.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      setDlgState(() => isSubmitting = true);
                      final messenger = ScaffoldMessenger.of(context);
                      final res = await ApiClient.submitPlaceReview(
                        token: token,
                        placeId: placeId,
                        rating: rating,
                        comment: comment,
                      );

                      if (ctx.mounted) Navigator.pop(ctx);
                      if (mounted) {
                        if (res['success'] == true) {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Review published! You can edit or delete it in your Reviews tab. ⭐'),
                              backgroundColor: AppTheme.primaryDark,
                            ),
                          );
                          _fetchReviews();
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
              child: isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Publish Review', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final place = widget.place;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: AppTheme.primaryDark,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                place['name'] ?? 'Attraction Details',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              background: Image.network(
                place['imageUrl'] ?? 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=1200',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: AppTheme.primaryDark),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Meta Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: AppTheme.accentGold, size: 22),
                          const SizedBox(width: 4),
                          Text(
                            '$_currentRating',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '($_reviewCount reviews)',
                            style: const TextStyle(color: AppTheme.textLight, fontSize: 13),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryLight.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          place['district'] ?? 'Sri Lanka',
                          style: const TextStyle(color: AppTheme.primaryBlue, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Description
                  const Text('Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                  const SizedBox(height: 8),
                  Text(
                    place['description'] ?? '',
                    style: const TextStyle(color: AppTheme.textMedium, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 20),

                  // Practical Info Grid Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.cardBorder),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryBlue.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      children: [
                        _buildInfoRow(Icons.access_time_rounded, 'Estimated Duration', place['duration'] ?? '120 mins'),
                        const Divider(color: AppTheme.cardBorder, height: 20),
                        _buildInfoRow(Icons.payments_outlined, 'Entry Fee', place['entryFee'] ?? 'Free'),
                        const Divider(color: AppTheme.cardBorder, height: 20),
                        _buildInfoRow(Icons.map_outlined, 'GPS Coordinates', '${place['latitude'] ?? 6.8768}° N, ${place['longitude'] ?? 81.0608}° E'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Interactive Google Map Card
                  Builder(
                    builder: (context) {
                      final double lat = (place['latitude'] is num)
                          ? (place['latitude'] as num).toDouble()
                          : double.tryParse(place['latitude']?.toString() ?? '') ?? 6.8768;
                      final double lng = (place['longitude'] is num)
                          ? (place['longitude'] as num).toDouble()
                          : double.tryParse(place['longitude']?.toString() ?? '') ?? 81.0608;
                      final LatLng targetPos = LatLng(lat, lng);

                      return Container(
                        height: 220,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.cardBorder),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryBlue.withValues(alpha: 0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Stack(
                          children: [
                            GoogleMap(
                              initialCameraPosition: CameraPosition(
                                target: targetPos,
                                zoom: 15,
                              ),
                              markers: {
                                Marker(
                                  markerId: MarkerId(place['id']?.toString() ?? 'attraction_marker'),
                                  position: targetPos,
                                  infoWindow: InfoWindow(
                                    title: place['name'] ?? 'Attraction',
                                    snippet: place['district'] ?? 'Sri Lanka',
                                  ),
                                ),
                              },
                              zoomControlsEnabled: false,
                              myLocationButtonEnabled: false,
                              mapToolbarEnabled: false,
                              compassEnabled: true,
                              gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                                Factory<OneSequenceGestureRecognizer>(
                                  () => EagerGestureRecognizer(),
                                ),
                              },
                            ),
                            // Top location pill badge
                            Positioned(
                              top: 12,
                              left: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.92),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: const [
                                    BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.location_on, color: Colors.redAccent, size: 14),
                                    const SizedBox(width: 4),
                                    Text(
                                      place['name'] ?? 'Attraction',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            // Bottom directions launcher button
                            Positioned(
                              bottom: 12,
                              right: 12,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryDark,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  elevation: 3,
                                ),
                                onPressed: () async {
                                  final Uri mapsUrl = Uri.parse(
                                    'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
                                  );
                                  if (await canLaunchUrl(mapsUrl)) {
                                    await launchUrl(mapsUrl, mode: LaunchMode.externalApplication);
                                  }
                                },
                                icon: const Icon(Icons.directions, size: 16, color: AppTheme.accentGold),
                                label: const Text('Directions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // AI Wishlist Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
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
                      icon: const Icon(Icons.auto_awesome, color: AppTheme.accentGold, size: 20),
                      label: const Text('Add to AI Trip Planner', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 30),

                  // ── REVIEWS SECTION ─────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.cardBorder),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Tourist Reviews',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, color: AppTheme.accentGold, size: 18),
                                    const SizedBox(width: 4),
                                    Text(
                                      '$_currentRating',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textDark),
                                    ),
                                    Text(
                                      ' · $_reviewCount review${_reviewCount == 1 ? '' : 's'}',
                                      style: const TextStyle(fontSize: 12, color: AppTheme.textLight),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryLight.withValues(alpha: 0.15),
                                foregroundColor: AppTheme.primaryBlue,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              onPressed: _showWriteReviewDialog,
                              icon: const Icon(Icons.rate_review_rounded, size: 16),
                              label: const Text('Write Review', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (_loadingReviews)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(20),
                              child: CircularProgressIndicator(strokeWidth: 2.5),
                            ),
                          )
                        else if (_reviews.isEmpty)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.backgroundLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              children: [
                                const Icon(Icons.rate_review_outlined, color: Colors.amber, size: 32),
                                const SizedBox(height: 6),
                                const Text(
                                  'No reviews yet for this attraction',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Be the first tourist to share insights and tips!',
                                  style: TextStyle(fontSize: 11, color: AppTheme.textLight),
                                ),
                                const SizedBox(height: 10),
                                OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.primaryBlue,
                                    side: const BorderSide(color: AppTheme.primaryBlue),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  onPressed: _showWriteReviewDialog,
                                  child: const Text('Rate This Place', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _reviews.length,
                            separatorBuilder: (_, __) => const Divider(color: AppTheme.cardBorder, height: 20),
                            itemBuilder: (ctx, i) {
                              final rev = _reviews[i];
                              final ratingVal = (rev['rating'] as num?)?.toInt() ?? 5;
                              final name = rev['touristName'] ?? 'Tourist';

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 14,
                                        backgroundColor: AppTheme.primaryBlue,
                                        child: Text(
                                          name.isNotEmpty ? name[0].toUpperCase() : 'T',
                                          style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textDark),
                                            ),
                                            Row(
                                              children: List.generate(5, (starIdx) {
                                                return Icon(
                                                  starIdx < ratingVal ? Icons.star_rounded : Icons.star_border_rounded,
                                                  color: AppTheme.accentGold,
                                                  size: 13,
                                                );
                                              }),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (rev['createdAt'] != null)
                                        Text(
                                          rev['createdAt'].toString().split('T').first,
                                          style: const TextStyle(fontSize: 10, color: AppTheme.textLight),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    rev['comment'] ?? '',
                                    style: const TextStyle(fontSize: 12.5, color: AppTheme.textMedium, height: 1.4),
                                  ),
                                ],
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String title, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.primaryBlue),
        const SizedBox(width: 12),
        Expanded(child: Text(title, style: const TextStyle(color: AppTheme.textMedium, fontSize: 13))),
        Text(value, style: const TextStyle(color: AppTheme.textDark, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
