import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';
import 'api_service.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await ApiService.post(
      '/auth/login',
      {'email': email, 'password': password},
      authenticated: false,
    );
    if (response['token'] != null) {
      await _storage.write(key: AppConstants.jwtKey, value: response['token']);
    }
    return response;
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: AppConstants.jwtKey);
  }

  static Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: AppConstants.jwtKey);
    return token != null && token.isNotEmpty;
  }

  static Future<void> logout() async {
    await _storage.delete(key: AppConstants.jwtKey);
  }
}
