import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api/v1';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000/api/v1';
    }
    return 'http://localhost:5000/api/v1';
  }

  static Future<http.Response> login(String email, String password) {
    return http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
  }

  static Future<http.Response> register({
    required String fullName,
    required String email,
    required String password,
    String? phoneNumber,
    String role = 'Tourist',
  }) {
    return http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'fullName': fullName,
        'email': email,
        'password': password,
        'phoneNumber': phoneNumber,
        'role': role,
      }),
    );
  }

  /// Fetch tourist destinations from live backend.
  /// Strictly filters for admin-added and admin-approved places only.
  static Future<List<Map<String, dynamic>>> getPlaces({String district = 'All'}) async {
    try {
      final districtParam = (district == 'All' || district.trim().isEmpty) ? '' : '&district=$district';
      final response = await http.get(
        Uri.parse('$baseUrl/tourism-places?pageSize=100$districtParam'),
      ).timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final rawItems = (data['data'] != null && data['data']['items'] != null)
            ? data['data']['items'] as List<dynamic>
            : (data['items'] as List<dynamic>? ?? []);

        return rawItems.where((item) {
          // Strictly admin approved places only
          final status = item['status']?.toString() ?? '';
          final statusName = (item['statusName'] ?? '').toString().toLowerCase();
          return status == '1' || status.toLowerCase() == 'approved' || statusName == 'approved';
        }).map<Map<String, dynamic>>((item) {
          final images = (item['images'] as List<dynamic>?) ?? [];
          final cover = images.isNotEmpty ? images.first.toString() : (item['imageUrl']?.toString() ?? '');
          final fee = item['entryFeeLkr'] ?? item['entryFee'];
          final feeStr = (fee == null || fee == 0 || fee == '0') ? 'Free' : 'LKR $fee';
          final dur = item['estimatedVisitDurationMinutes'] ?? item['duration'] ?? 90;

          final ratingNum = item['averageRating'] ?? item['rating'] ?? 4.9;
          final double rating = (ratingNum is num) ? ratingNum.toDouble() : double.tryParse(ratingNum.toString()) ?? 4.9;

          final latNum = item['latitude'] ?? 6.8768;
          final double lat = (latNum is num) ? latNum.toDouble() : double.tryParse(latNum.toString()) ?? 6.8768;

          final lngNum = item['longitude'] ?? 81.0608;
          final double lng = (lngNum is num) ? lngNum.toDouble() : double.tryParse(lngNum.toString()) ?? 81.0608;

          return {
            'id': item['id']?.toString() ?? '',
            'name': item['name']?.toString() ?? '',
            'district': item['district']?.toString() ?? '',
            'category': item['categoryName']?.toString() ?? item['category']?.toString() ?? 'Sightseeing & Nature',
            'description': item['description']?.toString() ?? '',
            'rating': rating,
            'reviewCount': item['reviewCount'] ?? 0,
            'entryFee': feeStr,
            'duration': '$dur mins',
            'imageUrl': cover.isNotEmpty ? cover : 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800',
            'latitude': lat,
            'longitude': lng,
            'openingHours': item['openingHours']?.toString() ?? '06:00 - 18:00',
            'status': 'Approved',
          };
        }).toList();
      }
    } catch (_) {}
    // Return empty list on failure - no mock data fallback!
    return [];
  }

  /// Fetch business listings (Hotels, Restaurants, Activities) from live backend.
  /// Strictly filters for business-owner submitted and admin-approved (Active) listings only.
  static Future<List<Map<String, dynamic>>> getBusinesses() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/businesses?status=Active&pageSize=100'),
      ).timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final rawItems = (data['data'] != null && data['data']['items'] != null)
            ? data['data']['items'] as List<dynamic>
            : (data['items'] as List<dynamic>? ?? []);

        return rawItems.where((item) {
          // Strictly admin-approved (Active) businesses only
          final status = item['verificationStatus']?.toString() ?? '';
          final statusName = (item['statusName'] ?? '').toString().toLowerCase();
          return status == '1' || status.toLowerCase() == 'active' || statusName == 'active';
        }).map<Map<String, dynamic>>((item) {
          final images = (item['images'] as List<dynamic>?) ?? [];
          final cover = images.isNotEmpty ? images.first.toString() : (item['imageUrl']?.toString() ?? '');

          final typeVal = item['typeName']?.toString() ??
              (item['type'] == 0 ? 'Hotel' : (item['type'] == 1 ? 'Restaurant' : 'Activity'));

          final isHotel = typeVal.toLowerCase() == 'hotel';

          // Extract price
          dynamic price = 0;
          if (isHotel) {
            price = 15000;
            if (item['hotel'] != null && item['hotel']['roomTypesJson'] != null) {
              try {
                final rooms = jsonDecode(item['hotel']['roomTypesJson'].toString());
                if (rooms is List && rooms.isNotEmpty && rooms[0]['pricePerNightLkr'] != null) {
                  price = rooms[0]['pricePerNightLkr'];
                }
              } catch (_) {}
            }
          } else {
            price = item['restaurant']?['averageCostPerPersonLkr'] ?? 2500;
          }

          // Extract amenities / features
          List<String> amenities = [];
          if (isHotel && item['hotel'] != null && item['hotel']['amenitiesJson'] != null) {
            try {
              final parsed = jsonDecode(item['hotel']['amenitiesJson'].toString());
              if (parsed is List) {
                amenities = parsed.map((e) => e.toString()).toList();
              }
            } catch (_) {}
          } else if (!isHotel && item['restaurant'] != null) {
            if (item['restaurant']['cuisineType'] != null) {
              amenities.add(item['restaurant']['cuisineType'].toString());
            }
            if (item['restaurant']['diningFeaturesJson'] != null) {
              try {
                final parsed = jsonDecode(item['restaurant']['diningFeaturesJson'].toString());
                if (parsed is List) {
                  amenities.addAll(parsed.map((e) => e.toString()));
                }
              } catch (_) {}
            }
          }

          if (amenities.isEmpty) {
            amenities = isHotel ? ['Free WiFi', 'Air Conditioning'] : ['Local Cuisine', 'Takeaway'];
          }

          String? offerText;
          final offers = (item['offers'] as List<dynamic>?) ?? [];
          if (offers.isNotEmpty && offers[0]['title'] != null) {
            offerText = offers[0]['title'].toString();
          }

          final ratingNum = item['rating'] ?? 4.8;
          final double rating = (ratingNum is num) ? ratingNum.toDouble() : double.tryParse(ratingNum.toString()) ?? 4.8;

          return {
            'id': item['id']?.toString() ?? '',
            'name': item['name']?.toString() ?? '',
            'type': typeVal,
            'district': item['district']?.toString() ?? '',
            'address': item['address']?.toString() ?? '',
            'pricePerNight': price,
            'rating': rating,
            'reviewCount': item['reviewCount'] ?? 0,
            'imageUrl': cover.isNotEmpty ? cover : (isHotel
                ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
                : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'),
            'amenities': amenities,
            'offer': offerText,
            'status': 'Active',
          };
        }).toList();
      }
    } catch (_) {}
    // Return empty list on failure - no mock data fallback!
    return [];
  }

  /// Submit a tourist-discovered place for admin review.
  /// Returns true on success, false on failure.
  static Future<bool> submitPlace({
    required String token,
    required String name,
    required String district,
    required String description,
    required double latitude,
    required double longitude,
    required String openingHours,
    required int estimatedVisitDurationMinutes,
    required double entryFeeLkr,
    required List<String> imageUrls,
  }) async {
    try {
      // categoryId: use Adventure & Hiking as default for tourist submissions
      const defaultCategoryId = '81260054-dfe5-43b2-90c4-26eb73754148';
      final body = jsonEncode({
        'categoryId': defaultCategoryId,
        'name': name,
        'district': district,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'openingHours': openingHours,
        'estimatedVisitDurationMinutes': estimatedVisitDurationMinutes,
        'entryFeeLkr': entryFeeLkr,
        'imageUrls': imageUrls.where((u) => u.trim().isNotEmpty).toList(),
      });
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
      final response = await http.post(
        Uri.parse('$baseUrl/tourism-places'),
        headers: headers,
        body: body,
      );
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Create a booking / reservation for a hotel or restaurant.
  /// Returns a map with 'success', 'bookingId', 'bookingReference', and 'message'.
  static Future<Map<String, dynamic>> createBooking({
    required String token,
    required String businessId,
    required String startDate,
    required String endDate,
    required int guestsCount,
    String? specialRequests,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'businessId': businessId,
          'startDate': startDate,
          'endDate': endDate,
          'guestsCount': guestsCount,
          if (specialRequests != null && specialRequests.isNotEmpty)
            'specialRequests': specialRequests,
        }),
      ).timeout(const Duration(seconds: 25));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final bookingData = data['data'] ?? {};
        return {
          'success': true,
          'bookingId': bookingData['id']?.toString() ?? '',
          'bookingReference': bookingData['bookingReference']?.toString() ?? 'TM-${DateTime.now().millisecondsSinceEpoch}',
          'totalAmount': bookingData['totalAmountLkr']?.toString() ?? '0',
          'message': data['message'] ?? 'Booking placed successfully.',
        };
      }
      final err = jsonDecode(response.body);
      return {
        'success': false,
        'message': err['message'] ?? 'Booking failed. Please try again.',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Cannot reach server. Check your connection.',
      };
    }
  }

  /// Cancel a booking by ID (within the 1-minute grace window).
  /// Returns true if cancellation was successful.
  static Future<bool> cancelBooking({
    required String token,
    required String bookingId,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/bookings/$bookingId/status');
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };
      final body = jsonEncode({
        'status': 'Cancelled',
        'reason': 'Cancelled by tourist within 1-minute grace period.',
      });

      // Try PATCH first
      var response = await http.patch(url, headers: headers, body: body).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200 || response.statusCode == 204) return true;

      // Fallback to POST
      response = await http.post(url, headers: headers, body: body).timeout(const Duration(seconds: 20));
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// Fetch all bookings belonging to the currently logged-in tourist.
  /// Returns a map with 'success', 'items', 'error', and 'statusCode'.
  static Future<Map<String, dynamic>> getMyBookingsResult({required String token}) async {
    if (token.isEmpty) {
      return {'success': false, 'items': <Map<String, dynamic>>[], 'error': 'Not logged in. Please sign in again.', 'statusCode': 401};
    }
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/bookings/my?pageSize=50'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final rawItems = (data['data'] != null && data['data']['items'] != null)
            ? data['data']['items'] as List<dynamic>
            : (data['items'] as List<dynamic>? ?? []);

        final items = rawItems.map<Map<String, dynamic>>((item) {
          final statusName = item['statusName']?.toString() ?? 'Pending';
          final num amt = item['totalAmountLkr'] ?? 0;
          return {
            'id': item['id']?.toString() ?? '',
            'ref': item['bookingReference']?.toString() ?? 'TM-REF',
            'businessName': item['businessName']?.toString() ?? 'Business Host',
            'businessId': item['businessId']?.toString() ?? '',
            'businessType': item['businessType'] ?? 1,
            'startDate': item['startDate']?.toString() ?? '',
            'endDate': item['endDate']?.toString() ?? '',
            'guestsCount': item['guestsCount'] ?? 2,
            'amount': 'LKR ${amt.toInt()}',
            'totalAmountLkr': amt,
            'status': statusName,
            'isExpired': statusName.toLowerCase() == 'expired' || item['isExpired'] == true,
            'cancellationReason': item['cancellationReason']?.toString(),
            'hasWarning': item['hasWarning'] == true,
            'hasComplaint': item['hasComplaint'] == true,
            'complaintText': item['complaintText']?.toString(),
            'createdAt': item['createdAt']?.toString() ?? '',
          };
        }).toList();

        return {'success': true, 'items': items, 'error': null, 'statusCode': 200};
      } else if (response.statusCode == 401) {
        return {'success': false, 'items': <Map<String, dynamic>>[], 'error': 'Session expired. Please log in again.', 'statusCode': 401};
      } else {
        return {'success': false, 'items': <Map<String, dynamic>>[], 'error': 'Server returned error ${response.statusCode}. Please try again.', 'statusCode': response.statusCode};
      }
    } catch (e) {
      return {'success': false, 'items': <Map<String, dynamic>>[], 'error': 'Cannot reach server. Make sure the backend is running.', 'statusCode': 0};
    }
  }

  /// Fetch all bookings belonging to the currently logged-in tourist.
  static Future<List<Map<String, dynamic>>> getMyBookings({required String token}) async {
    final result = await getMyBookingsResult(token: token);
    return (result['items'] as List<Map<String, dynamic>>? ?? []);
  }

  /// Re-send an expired or cancelled booking request.
  static Future<bool> resendBooking({
    required String token,
    required String bookingId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings/$bookingId/resend'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 20));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Submit a formal complaint to TourMate administration regarding an unconfirmed/expired booking.
  static Future<bool> submitComplaint({
    required String token,
    required String bookingId,
    required String complaintText,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings/$bookingId/complain'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'complaintText': complaintText,
        }),
      ).timeout(const Duration(seconds: 20));

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Submit a verified post-stay booking review (only for completed bookings).
  static Future<Map<String, dynamic>> submitBookingReview({
    required String token,
    required String bookingId,
    required int rating,
    required String comment,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings/$bookingId/review'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rating': rating,
          'comment': comment,
        }),
      ).timeout(const Duration(seconds: 25));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data['data'], 'message': data['message'] ?? 'Review submitted!'};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to submit review'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Network error submitting review: $e'};
    }
  }

  /// Fetch all reviews submitted by the currently logged-in tourist.
  static Future<List<Map<String, dynamic>>> getMyReviews({required String token}) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/reviews/my'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 25));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = (data['data'] as List<dynamic>?) ?? [];
        return list.map<Map<String, dynamic>>((r) => {
          'id': r['id']?.toString() ?? '',
          'targetId': r['targetId']?.toString() ?? '',
          'targetType': r['targetType']?.toString() ?? 'Business',
          'bookingId': r['bookingId']?.toString(),
          'bookingReference': r['bookingReference']?.toString(),
          'businessName': r['businessName']?.toString() ?? 'Business Host',
          'rating': r['rating'] ?? 5,
          'comment': r['comment']?.toString() ?? '',
          'ownerReply': r['ownerReply']?.toString(),
          'ownerRepliedAt': r['ownerRepliedAt']?.toString(),
          'isHeartedByOwner': r['isHeartedByOwner'] == true,
          'ownerHeartedAt': r['ownerHeartedAt']?.toString(),
          'isDeletedByOwner': r['isDeletedByOwner'] == true,
          'isDeletedByTourist': r['isDeletedByTourist'] == true,
          'createdAt': r['createdAt']?.toString() ?? '',
          'updatedAt': r['updatedAt']?.toString(),
        }).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Update an existing review rating and comment.
  static Future<bool> updateReview({
    required String token,
    required String reviewId,
    required int rating,
    required String comment,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/reviews/$reviewId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'rating': rating,
          'comment': comment,
        }),
      ).timeout(const Duration(seconds: 20));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Delete a review as a tourist.
  static Future<bool> deleteReview({
    required String token,
    required String reviewId,
  }) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/reviews/$reviewId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 20));

      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Submit a review for a tourism place / attraction.
  static Future<Map<String, dynamic>> submitPlaceReview({
    required String token,
    required String placeId,
    required int rating,
    required String comment,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/reviews'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'targetType': 'Place',
          'targetId': placeId,
          'rating': rating,
          'comment': comment,
        }),
      ).timeout(const Duration(seconds: 25));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data['data'], 'message': data['message'] ?? 'Review submitted!'};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to submit place review'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  /// Fetch all reviews for a specific tourism place.
  static Future<List<Map<String, dynamic>>> getPlaceReviews(String placeId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/reviews?targetType=Place&targetId=$placeId'),
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = (data['data'] as List<dynamic>?) ?? [];
        return list.map<Map<String, dynamic>>((r) => {
          'id': r['id']?.toString() ?? '',
          'touristUserId': r['touristUserId']?.toString() ?? '',
          'touristName': r['touristName']?.toString() ?? 'Tourist',
          'rating': r['rating'] ?? 5,
          'comment': r['comment']?.toString() ?? '',
          'createdAt': r['createdAt']?.toString() ?? '',
        }).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}

