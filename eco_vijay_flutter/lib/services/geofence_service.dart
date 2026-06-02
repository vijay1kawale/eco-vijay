import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'api_service.dart';
import 'auth_service.dart';

class GeofenceService {
  GeofenceService._();

  /// Broadcasts a message when auto-checkout fires (null = no message)
  static final ValueNotifier<String?> autoCheckoutMessage =
      ValueNotifier<String?>(null);

  static StreamSubscription<Position>? _positionSub;

  /// Per-user office coordinates cached during service startup
  static double? _officeLatitude;
  static double? _officeLongitude;

  /// Start listening for position updates.
  static void start() async {
    _positionSub?.cancel();

    // Load per-user office coordinates
    await _loadOfficeCoordinates();

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // metres
    );

    _positionSub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition, onError: (e) {
      debugPrint('GeofenceService error: $e');
    });
  }

  /// Load office coordinates for the logged-in user
  static Future<void> _loadOfficeCoordinates() async {
    try {
      final userData = await AuthService.getUserData();
      if (userData != null) {
        // If user is an office user with assigned coordinates, use them
        if ((userData['role'] == 'office' || userData['role'] == 'office_user') &&
            userData['assigned_office_lat'] != null &&
            userData['assigned_office_lng'] != null) {
          _officeLatitude = (userData['assigned_office_lat'] as num).toDouble();
          _officeLongitude = (userData['assigned_office_lng'] as num).toDouble();
          return;
        }
      }
      // Fallback to global constants if no per-user coordinates
      _officeLatitude = AppConstants.officeLatitude;
      _officeLongitude = AppConstants.officeLongitude;
    } catch (e) {
      debugPrint('Error loading office coordinates: $e');
      _officeLatitude = AppConstants.officeLatitude;
      _officeLongitude = AppConstants.officeLongitude;
    }
  }

  /// Stop listening.
  static void stop() {
    _positionSub?.cancel();
    _positionSub = null;
  }

  static Future<void> _onPosition(Position position) async {
    // Debug builds skip auto-checkout so developers can test without being at the office
    if (kDebugMode) return;

    // If office coordinates aren't loaded, skip geofence check
    if (_officeLatitude == null || _officeLongitude == null) return;

    final distance = AppConstants.calculateDistanceMetres(
      position.latitude,
      position.longitude,
      _officeLatitude!,
      _officeLongitude!,
    );

    if (distance <= AppConstants.geofenceRadiusMetres) return;

    // User is outside the geofence — check for an active attendance
    final prefs = await SharedPreferences.getInstance();
    final attendanceId = prefs.getString(AppConstants.activeAttendanceKey);
    if (attendanceId == null) return;

    // Trigger checkout
    try {
      await ApiService.post('/attendance/checkout', {
        'attendance_id': attendanceId,
        'check_out': DateTime.now().toUtc().toIso8601String(),
        'check_out_lat': position.latitude,
        'check_out_lng': position.longitude,
      });
      await prefs.remove(AppConstants.activeAttendanceKey);
      autoCheckoutMessage.value =
          'You moved outside the office geofence and were automatically checked out.';
    } catch (e) {
      debugPrint('GeofenceService auto-checkout error: $e');
    }
  }
}
