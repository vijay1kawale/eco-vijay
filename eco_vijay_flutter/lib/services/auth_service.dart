import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../utils/constants.dart';
import 'api_service.dart';

class AuthService {
  // FIXED: encryptedSharedPreferences=true uses AES-256-GCM (EncryptedSharedPreferences)
  // instead of the legacy RSA cipher that corrupts after reinstall / OS upgrade.
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await ApiService.post(
      '/auth/login',
      {'email': email, 'password': password},
      authenticated: false,
    );
    if (response['token'] != null) {
      await _safeWrite(AppConstants.jwtKey, response['token'] as String);
    }
    // Store user data (role, name, etc.) for quick access
    if (response['user'] != null) {
      await _safeWrite(AppConstants.userDataKey, jsonEncode(response['user']));
    }
    return response;
  }

  static Future<String?> getToken() async {
    return await _safeRead(AppConstants.jwtKey);
  }

  static Future<Map<String, dynamic>?> getUserData() async {
    final dataStr = await _safeRead(AppConstants.userDataKey);
    if (dataStr == null) return null;
    try {
      return jsonDecode(dataStr) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<String?> getUserRole() async {
    final userData = await getUserData();
    return userData?['role'] as String?;
  }

  static Future<bool> isLoggedIn() async {
    final token = await _safeRead(AppConstants.jwtKey);
    return token != null && token.isNotEmpty;
  }

  static Future<void> logout() async {
    try {
      await _storage.delete(key: AppConstants.jwtKey);
      await _storage.delete(key: AppConstants.userDataKey);
    } catch (_) {}
  }

  // ── private helpers ────────────────────────────────────────────────────────

  // FIXED: catches PlatformException (BadPaddingException / keystore corruption)
  // and wipes all storage so the app falls back to the login screen cleanly.
  static Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } on PlatformException {
      await _wipeStorage();
      return null;
    }
  }

  static Future<void> _safeWrite(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } on PlatformException {
      await _wipeStorage();
    }
  }

  static Future<void> _wipeStorage() async {
    try {
      await _storage.deleteAll();
    } catch (_) {}
  }
}
