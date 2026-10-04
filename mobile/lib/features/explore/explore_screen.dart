import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import 'place_detail_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  String _selectedDistrict = 'All';
  String _searchQuery = '';
  String _sortOrder = 'Ascending';
  List<Map<String, dynamic>> _places = [];
  bool _isLoading = false;
  final Set<String> _favourites = {'p1'};

  List<Map<String, dynamic>> get _filteredPlaces {
    List<Map<String, dynamic>> result = List.from(_places);
    
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result.where((place) {
        final name = (place['name'] ?? '').toString().toLowerCase();
        final district = (place['district'] ?? '').toString().toLowerCase();
        return name.contains(query) || district.contains(query);
      }).toList();
    }

    result.sort((a, b) {
      final nameA = (a['name'] ?? '').toString().toLowerCase();
      final nameB = (b['name'] ?? '').toString().toLowerCase();
      return _sortOrder == 'Ascending' ? nameA.compareTo(nameB) : nameB.compareTo(nameA);
    });

    return result;
  }

  final List<String> _districts = ['All', 'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'];

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  void _loadPlaces() async {
    setState(() => _isLoading = true);
    final results = await ApiClient.getPlaces(district: _selectedDistrict);
    setState(() {
      _places = results;
      _isLoading = false;
    });
  }

  // ─── Submit Discovered Place Bottom Sheet ─────────────────────────────────
  void _openSubmitSheet() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final latCtrl = TextEditingController(text: '6.8768');
    final lngCtrl = TextEditingController(text: '81.0608');
    final openingCtrl = TextEditingController(text: '06:00 - 18:00');
    final durationCtrl = TextEditingController(text: '120');
    final feeCtrl = TextEditingController(text: '0');
    final imageUrlCtrl = TextEditingController();
    final imageUrlCtrl2 = TextEditingController();
    bool isSaving = false;
    String? error;
    String selectedDistrict = 'Badulla';

    final districts = ['Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          Future<void> handleSubmit() async {
            if (nameCtrl.text.trim().isEmpty) {
              setModalState(() => error = 'Place name is required.');
              return;
            }
            if (descCtrl.text.trim().isEmpty) {
              setModalState(() => error = 'Description is required.');
              return;
            }
            if (descCtrl.text.trim().length <= 10) {
              setModalState(() => error = 'Description must be more than 10 characters.');
              return;
            }

            final openingHoursStr = openingCtrl.text.trim();
            if (openingHoursStr.isNotEmpty) {
              final match = RegExp(r'^((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)$').firstMatch(openingHoursStr);
              if (match == null) {
                setModalState(() => error = 'Opening hours must be in HH:mm - HH:mm format.');
                return;
              }
              if (match.group(1)!.compareTo(match.group(2)!) >= 0) {
                setModalState(() => error = 'Opening time must be earlier than closing time.');
                return;
              }
            }

            setModalState(() { isSaving = true; error = null; });

            // Get auth token if user is logged in
            final token = await AuthProvider.getToken() ?? '';

            final imageUrls = [
              imageUrlCtrl.text.trim(),
              imageUrlCtrl2.text.trim(),
            ].where((u) => u.isNotEmpty).toList();

            final success = await ApiClient.submitPlace(
              token: token,
              name: nameCtrl.text.trim(),
              district: selectedDistrict,
              description: descCtrl.text.trim(),
              latitude: double.tryParse(latCtrl.text) ?? 6.8768,
              longitude: double.tryParse(lngCtrl.text) ?? 81.0608,
              openingHours: openingCtrl.text.trim().isEmpty ? '06:00 - 18:00' : openingCtrl.text.trim(),
              estimatedVisitDurationMinutes: int.tryParse(durationCtrl.text) ?? 120,
              entryFeeLkr: double.tryParse(feeCtrl.text) ?? 0,
              imageUrls: imageUrls,
            );

            setModalState(() => isSaving = false);
            if (success) {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Row(children: [
                    Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text('Place submitted! Admin will review it soon.'),
                  ]),
                  backgroundColor: Colors.green.shade600,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              );
            } else {
              setModalState(() => error = 'Submission failed. Please check your connection and try again.');
            }
          }

          return Container(
            height: MediaQuery.of(ctx).size.height * 0.92,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 4),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.add_location_alt_rounded, color: AppTheme.primaryBlue, size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Submit a Discovered Place', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textDark)),
                            Text('Share a new destination with the community', style: TextStyle(fontSize: 12, color: AppTheme.textMedium)),
                          ],
                        ),
                      ),
                      IconButton(onPressed: () => Navigator.of(ctx).pop(), icon: const Icon(Icons.close, size: 22, color: AppTheme.textMedium)),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFE8EDF2)),

                // Scrollable Form
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Error
                        if (error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Row(children: [
                              Icon(Icons.error_outline, color: Colors.red.shade600, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(error!, style: TextStyle(color: Colors.red.shade700, fontSize: 12, fontWeight: FontWeight.w600))),
                            ]),
                          ),

                        _label('Place Name *'),
                        _field(nameCtrl, hint: 'e.g. Hidden Waterfall near Ella'),
                        const SizedBox(height: 14),

                        _label('District *'),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7F9FC),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFDDE3EC)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedDistrict,
                              isExpanded: true,
                              style: const TextStyle(color: AppTheme.textDark, fontSize: 14, fontWeight: FontWeight.w500),
                              items: districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                              onChanged: (v) => setModalState(() => selectedDistrict = v!),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        _label('Description *'),
                        _field(descCtrl, hint: 'Describe what makes this place special...', maxLines: 3),
                        const SizedBox(height: 14),

                        // GPS Coordinates
                        Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            _label('Latitude'),
                            _field(latCtrl, hint: '6.8768', keyboard: TextInputType.number),
                          ])),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            _label('Longitude'),
                            _field(lngCtrl, hint: '81.0608', keyboard: TextInputType.number),
                          ])),
                        ]),
                        const SizedBox(height: 4),
                        const Text(
                          '💡 Find GPS from Google Maps → long press → copy coordinates',
                          style: TextStyle(fontSize: 11, color: AppTheme.textLight),
                        ),
                        const SizedBox(height: 14),

                        Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            _label('Opening Hours'),
                            _field(openingCtrl, hint: '06:00 - 18:00'),
                            const Padding(
                              padding: EdgeInsets.only(top: 4, left: 4),
                              child: Text('Example: 06:00 - 18:00', style: TextStyle(fontSize: 11, color: AppTheme.textLight)),
                            ),
                          ])),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            _label('Visit Duration (min)'),
                            _field(durationCtrl, hint: '120', keyboard: TextInputType.number),
                          ])),
                        ]),
                        const SizedBox(height: 14),

                        _label('Entry Fee (LKR, 0 = Free)'),
                        _field(feeCtrl, hint: '0', keyboard: TextInputType.number),
                        const SizedBox(height: 14),

                        // Image URLs
                        Row(children: [
                          const Icon(Icons.image_outlined, color: AppTheme.primaryBlue, size: 16),
                          const SizedBox(width: 6),
                          _label('Image URL (paste a direct image link)'),
                        ]),
                        _field(imageUrlCtrl, hint: 'https://example.com/photo.jpg'),
                        const SizedBox(height: 8),
                        _field(imageUrlCtrl2, hint: 'Second image URL (optional)'),
                        const SizedBox(height: 6),
                        const Text(
                          '💡 You can use Unsplash, Google Photos, or any direct image URL (.jpg, .png, .webp)',
                          style: TextStyle(fontSize: 11, color: AppTheme.textLight, height: 1.5),
                        ),

                        const SizedBox(height: 24),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: isSaving ? null : handleSubmit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryBlue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 2,
                            ),
                            child: isSaving
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Submit for Admin Review', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Center(
                          child: Text(
                            'Your submission will be reviewed by an admin before going live.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: AppTheme.textLight),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textDark)),
  );

  Widget _field(TextEditingController ctrl, {String hint = '', int maxLines = 1, TextInputType keyboard = TextInputType.text}) =>
    TextField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboard,
      style: const TextStyle(color: AppTheme.textDark, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppTheme.textLight, fontSize: 13),
        filled: true,
        fillColor: const Color(0xFFF7F9FC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDDE3EC))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDDE3EC))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5)),
      ),
    );

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => _loadPlaces(),
      color: AppTheme.primaryBlue,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Search Bar
          TextField(
            onChanged: (val) {
              setState(() {
                _searchQuery = val;
              });
            },
            style: const TextStyle(color: AppTheme.textDark, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Search Ella, Sigiriya, Kandy, Galle...',
              hintStyle: const TextStyle(color: AppTheme.textLight, fontSize: 13),
              prefixIcon: const Icon(Icons.search, color: AppTheme.primaryBlue, size: 20),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppTheme.cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppTheme.cardBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 2),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
          const SizedBox(height: 14),

          // Filters
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedDistrict,
                      isExpanded: true,
                      icon: const Icon(Icons.arrow_drop_down, color: AppTheme.textMedium),
                      style: const TextStyle(color: AppTheme.textDark, fontSize: 14, fontWeight: FontWeight.w500),
                      dropdownColor: Colors.white,
                      items: _districts.map((d) {
                        return DropdownMenuItem(
                          value: d,
                          child: Text(d == 'All' ? 'All Districts' : d, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null && val != _selectedDistrict) {
                          setState(() => _selectedDistrict = val);
                          _loadPlaces();
                        }
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _sortOrder,
                      isExpanded: true,
                      icon: const Icon(Icons.sort, color: AppTheme.textMedium, size: 18),
                      style: const TextStyle(color: AppTheme.textDark, fontSize: 14, fontWeight: FontWeight.w500),
                      dropdownColor: Colors.white,
                      items: ['Ascending', 'Descending'].map((s) {
                        return DropdownMenuItem(
                          value: s,
                          child: Text(s, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null && val != _sortOrder) {
                          setState(() => _sortOrder = val);
                        }
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Section Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 18),
                  SizedBox(width: 6),
                  Text(
                    'Admin-Approved Places',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textDark),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_filteredPlaces.length} verified',
                  style: const TextStyle(fontSize: 12, color: AppTheme.primaryBlue, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Places List or Empty State
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
          else if (_filteredPlaces.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.verified_user_rounded, color: AppTheme.primaryBlue, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No Approved Places Found',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Only destinations added and approved by administrators appear in this feed. Please ensure the backend is running and places are approved.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppTheme.textMedium, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadPlaces,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Refresh Destinations'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            )
          else
            ..._filteredPlaces.map((place) => _buildPlaceCard(place)),

        const SizedBox(height: 20),

        // Submit Discovered Place CTA
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppTheme.primaryBlue.withOpacity(0.08), AppTheme.primaryLight.withOpacity(0.04)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.18)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(children: [
                Icon(Icons.explore_outlined, color: AppTheme.primaryBlue, size: 20),
                SizedBox(width: 8),
                Text('Discovered Something New?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textDark)),
              ]),
              const SizedBox(height: 6),
              const Text(
                'Share a hidden gem or newly discovered destination with the TourMate community. Admins will review and publish it.',
                style: TextStyle(fontSize: 12, color: AppTheme.textMedium, height: 1.5),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _openSubmitSheet,
                  icon: const Icon(Icons.add_location_alt_rounded, size: 18),
                  label: const Text('Submit a Discovered Place', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    ),
  );
}

  Widget _buildPlaceCard(Map<String, dynamic> place) {
    final isFav = _favourites.contains(place['id']);
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.cardBorder),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => PlaceDetailScreen(place: place)),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Badges
            Stack(
              children: [
                Image.network(
                  place['imageUrl'] ?? 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800',
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 180,
                    color: AppTheme.backgroundLight,
                    child: const Center(child: Icon(Icons.image, color: AppTheme.cardBorder, size: 40)),
                  ),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryDark.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      place['category'] ?? 'Attraction',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        if (isFav) {
                          _favourites.remove(place['id']);
                        } else {
                          _favourites.add(place['id']);
                        }
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4),
                        ],
                      ),
                      child: Icon(
                        isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: isFav ? AppTheme.roseRed : AppTheme.textLight,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Card Body
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          place['name'] ?? '',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: AppTheme.accentGold, size: 18),
                          const SizedBox(width: 3),
                          Text(
                            '${place['rating'] ?? 4.8}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                          ),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    place['description'] ?? '',
                    style: const TextStyle(color: AppTheme.textMedium, fontSize: 13, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 15, color: AppTheme.primaryBlue),
                          const SizedBox(width: 4),
                          Text(
                            '${place['district']} District',
                            style: const TextStyle(color: AppTheme.primaryBlue, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.backgroundLight,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.cardBorder),
                        ),
                        child: Text(
                          'Entry: ${place['entryFee'] ?? 'Free'}',
                          style: const TextStyle(color: AppTheme.textDark, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
