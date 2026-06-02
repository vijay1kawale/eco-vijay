import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class VisitLog {
  final double lat;
  final double lng;
  final DateTime visitedAt;
  final String? note;

  VisitLog({
    required this.lat,
    required this.lng,
    required this.visitedAt,
    this.note,
  });

  factory VisitLog.fromJson(Map<String, dynamic> json) {
    return VisitLog(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      visitedAt: DateTime.parse(json['visited_at']).toLocal(),
      note: json['note'],
    );
  }

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'visited_at': visitedAt.toUtc().toIso8601String(),
        'note': note,
      };
}

class AttendanceModel {
  final String id;
  final String userId;
  final DateTime date;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final double? checkInLat;
  final double? checkInLng;
  final double? checkOutLat;
  final double? checkOutLng;
  final double? totalHours;
  final String status; // 'present', 'half_day', 'absent'
  final List<VisitLog> visitLogs;

  AttendanceModel({
    required this.id,
    required this.userId,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.checkInLat,
    this.checkInLng,
    this.checkOutLat,
    this.checkOutLng,
    this.totalHours,
    required this.status,
    required this.visitLogs,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    List<VisitLog> logs = [];
    final rawLogs = json['visit_logs'];
    if (rawLogs != null && rawLogs is List) {
      logs = rawLogs
          .whereType<Map<String, dynamic>>()
          .map((e) => VisitLog.fromJson(e))
          .toList();
    }

    return AttendanceModel(
      id: json['id'].toString(),
      userId: json['user_id'].toString(),
      date: DateTime.parse(json['date']),
      checkIn: json['check_in'] != null
          ? DateTime.parse(json['check_in']).toLocal()
          : null,
      checkOut: json['check_out'] != null
          ? DateTime.parse(json['check_out']).toLocal()
          : null,
      checkInLat: json['check_in_lat'] != null
          ? (json['check_in_lat'] as num).toDouble()
          : (json['location_lat'] != null ? (json['location_lat'] as num).toDouble() : null),
      checkInLng: json['check_in_lng'] != null
          ? (json['check_in_lng'] as num).toDouble()
          : (json['location_lng'] != null ? (json['location_lng'] as num).toDouble() : null),
      checkOutLat: json['check_out_lat'] != null
          ? (json['check_out_lat'] as num).toDouble()
          : null,
      checkOutLng: json['check_out_lng'] != null
          ? (json['check_out_lng'] as num).toDouble()
          : null,
      totalHours: json['total_hours'] != null
          ? double.tryParse(json['total_hours'].toString())
          : null,
      status: json['status'] ?? 'absent',
      visitLogs: logs,
    );
  }

  /// Human-readable status label
  String get statusLabel {
    switch (status) {
      case 'present':
        return 'Present';
      case 'half_day':
        return 'Half Day';
      case 'absent':
        return 'Absent';
      default:
        return status;
    }
  }

  /// Color for the status badge
  Color get statusColor {
    switch (status) {
      case 'present':
        return AppColors.success;
      case 'half_day':
        return AppColors.warning;
      case 'absent':
        return AppColors.danger;
      default:
        return AppColors.textSecondary;
    }
  }

  /// Formatted hours string e.g. "6h 30m"
  String get hoursDisplay {
    if (totalHours == null) return '--';
    final h = totalHours!.floor();
    final m = ((totalHours! - h) * 60).round();
    if (h == 0) return '${m}m';
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }

  String get checkInCoords {
    if (checkInLat == null || checkInLng == null) return '--';
    return '${checkInLat!.toStringAsFixed(6)}, ${checkInLng!.toStringAsFixed(6)}';
  }

  String get checkOutCoords {
    if (checkOutLat == null || checkOutLng == null) return '--';
    return '${checkOutLat!.toStringAsFixed(6)}, ${checkOutLng!.toStringAsFixed(6)}';
  }
}
