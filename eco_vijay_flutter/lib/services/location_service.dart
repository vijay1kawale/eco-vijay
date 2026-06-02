import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationService {
  static Future<Position?> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[LocationService] Location services disabled');
      return null;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('[LocationService] Permission denied');
        return null;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      debugPrint('[LocationService] Permission denied forever');
      return null;
    }

    // geolocator 11.x: getCurrentPosition uses desiredAccuracy + timeLimit
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
      debugPrint('[LocationService] Got position: ${pos.latitude}, ${pos.longitude}');
      return pos;
    } on TimeoutException {
      debugPrint('[LocationService] GPS timed out — falling back to last known');
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      debugPrint('[LocationService] getCurrentPosition error: $e — falling back');
      return await Geolocator.getLastKnownPosition();
    }
  }

  static Future<String> getCityFromCoords(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = [p.subLocality, p.locality].where((s) => s != null && s.isNotEmpty);
        if (parts.isNotEmpty) return parts.join(', ');
      }
    } catch (_) {}
    return 'Unknown location';
  }
}
