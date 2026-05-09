import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class ApiService {
  static const _storage = FlutterSecureStorage();

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
    final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
    final response = await http.get(uri, headers: await _headers());
    return _handle(response);
  }

  static Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    bool authenticated = true,
  }) async {
    final uri = Uri.parse('${AppConstants.apiBaseUrl}$path');
    final response = await http.post(
      uri,
      headers: await _headers(authenticated: authenticated),
      body: jsonEncode(body),
    );
    return _handle(response);
  }

  static dynamic _handle(http.Response response) {
    final decoded = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }
    final errorMsg = decoded['error'] ?? 'Request failed (${response.statusCode})';
    throw Exception(errorMsg);
  }
}
