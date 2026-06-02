import '../models/attendance_model.dart';
import 'api_service.dart';

class AttendanceService {
  /// POST /attendance/checkin
  /// Returns the raw map so the caller can extract the attendance id.
  static Future<Map<String, dynamic>> checkIn({
    required String userId,
    required DateTime checkIn,
    required double lat,
    required double lng,
    required DateTime date,
  }) async {
    final result = await ApiService.post('/attendance/checkin', {
      'user_id': userId,
      'check_in': checkIn.toUtc().toIso8601String(),
      'check_in_lat': lat,
      'check_in_lng': lng,
      'date': '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
    });
    return Map<String, dynamic>.from(result as Map);
  }

  /// POST /attendance/checkout
  static Future<void> checkOut({
    required String attendanceId,
    required DateTime checkOut,
    required double lat,
    required double lng,
  }) async {
    await ApiService.post('/attendance/checkout', {
      'attendance_id': attendanceId,
      'check_out': checkOut.toUtc().toIso8601String(),
      'check_out_lat': lat,
      'check_out_lng': lng,
    });
  }

  /// POST /attendance/visit
  static Future<void> logVisit({
    required String userId,
    required double lat,
    required double lng,
    required DateTime visitedAt,
    String? note,
  }) async {
    await ApiService.post('/attendance/visit', {
      'user_id': userId,
      'location_lat': lat,
      'location_lng': lng,
      'visited_at': visitedAt.toUtc().toIso8601String(),
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }

  /// GET /attendance/today
  static Future<AttendanceModel?> getToday() async {
    try {
      final data = await ApiService.get('/attendance/today');
      if (data == null) return null;
      return AttendanceModel.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (_) {
      return null;
    }
  }

  /// GET /attendance/history
  static Future<List<AttendanceModel>> getHistory() async {
    try {
      final data = await ApiService.get('/attendance/history');
      if (data == null) return [];
      final list = data as List;
      return list
          .map((e) =>
              AttendanceModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
