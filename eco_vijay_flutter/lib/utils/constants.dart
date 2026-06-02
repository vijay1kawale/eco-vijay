import 'dart:math' as math;

class AppConstants {
  // Local dev: Use localhost for web builds, or your PC IP for mobile
  // For production: 'https://eco-vijay-backend.vercel.app'
  static const String apiBaseUrl = 'http://localhost:3002';

  // JWT storage key
  static const String jwtKey = 'eco_vijay_jwt';
  static const String userDataKey = 'eco_vijay_user_data';

  // Nearby radius in km
  static const double nearbyRadiusKm = 10.0;

  // Attendance
  static const String activeAttendanceKey = 'active_attendance_id';
  static const double officeLatitude = 18.6414288;
  static const double officeLongitude = 73.7918347;
  static const double geofenceRadiusMetres = 100.0;

  static double calculateDistanceMetres(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const earthRadius = 6371000.0; // metres
    final dLat = _degreesToRadians(lat2 - lat1);
    final dLng = _degreesToRadians(lng2 - lng1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degreesToRadians(lat1)) *
        math.cos(_degreesToRadians(lat2)) *
        math.sin(dLng / 2) * math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  static double _degreesToRadians(double degrees) =>
      degrees * (math.pi / 180);

  // EPR service types
  static const List<String> serviceTypes = [
    'Plastic EPR Registration',
    'E-Waste EPR Registration',
    'Battery EPR Registration',
    'Tyre EPR Registration',
    'CPCB Annual Filing',
    'Compliance Audit',
    'EPR Certificate Renewal',
  ];

  // Lead status values
  static const List<String> leadStatuses = [
    'New',
    'Prospect',
    'Contacted',
    'Interested',
    'Negotiation',
    'Closed',
    'Lost',
  ];
}
