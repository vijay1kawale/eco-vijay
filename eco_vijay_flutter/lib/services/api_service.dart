import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../main.dart';
import '../utils/constants.dart';

class ApiService {
  // FIXED: must use the same AndroidOptions as AuthService so both read/write
  // from the same EncryptedSharedPreferences storage backend.
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<String?> _getToken() async {
    return await _storage.read(key: AppConstants.jwtKey);
  }

  static Future<Map<String, String>> _headers({bool authenticated = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (authenticated) {
      final token = await _getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Future<dynamic> get(String path) async {
    try {
      final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
      final response = await http
          .get(uri, headers: await _headers())
          .timeout(const Duration(seconds: 15));
      return _handle(response);
    } on SocketException catch (e) {
      throw Exception('Cannot reach server (${e.message}). Check Wi-Fi and that the backend is running.');
    } on TimeoutException {
      throw Exception('Request timed out. Please try again.');
    }
  }

  static Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    bool authenticated = true,
  }) async {
    try {
      final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
      final response = await http
          .post(
            uri,
            headers: await _headers(authenticated: authenticated),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      return _handle(response);
    } on SocketException catch (e) {
      throw Exception('Cannot reach server (${e.message}). Check Wi-Fi and that the backend is running.');
    } on TimeoutException {
      throw Exception('Request timed out. Please try again.');
    }
  }

  static Future<dynamic> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
      final response = await http
          .patch(
            uri,
            headers: await _headers(),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      return _handle(response);
    } on SocketException catch (e) {
      throw Exception('Cannot reach server (${e.message}). Check Wi-Fi and that the backend is running.');
    } on TimeoutException {
      throw Exception('Request timed out. Please try again.');
    }
  }

  static Future<dynamic> postWithFile(
    String path,
    Map<String, String> fields,
    File file,
    String fileFieldName, {
    bool authenticated = true,
  }) async {
    try {
      final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
      final request = http.MultipartRequest('POST', uri);

      // Add headers
      final headers = await _headers(authenticated: authenticated);
      request.headers.addAll(headers);

      // Add form fields
      request.fields.addAll(fields);

      // Add file
      request.files.add(
        await http.MultipartFile.fromPath(fileFieldName, file.path),
      );

      final response = await request.send().timeout(const Duration(seconds: 30));
      final responseBytes = await response.stream.toBytes();
      final responseString = String.fromCharCodes(responseBytes);
      final responseObj = http.Response(responseString, response.statusCode);

      return _handle(responseObj);
    } on SocketException catch (e) {
      throw Exception('Cannot reach server (${e.message}). Check Wi-Fi and that the backend is running.');
    } on TimeoutException {
      throw Exception('Request timed out. Please try again.');
    }
  }

  static dynamic _handle(http.Response response) {
    // FIXED: 401 → clear token and redirect to login
    if (response.statusCode == 401) {
      _storage.delete(key: AppConstants.jwtKey);
      final ctx = navigatorKey.currentContext;
      if (ctx != null) {
        navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false);
      }
      throw Exception('Session expired. Please log in again.');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    }

    String errorMsg = 'Request failed (${response.statusCode})';
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          errorMsg = decoded['error'] ?? decoded['message'] ?? errorMsg;
        }
      } catch (_) {}
    }
    throw Exception(errorMsg);
  }
}
