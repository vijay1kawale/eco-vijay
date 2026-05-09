import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/splash/splash_screen.dart';
import 'screens/login/login_screen.dart';
import 'screens/home/home_scaffold.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EcoVijayApp());
}

class EcoVijayApp extends StatelessWidget {
  const EcoVijayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eco-Vijay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/map': (_) => const HomeScaffold(),
      },
    );
  }
}

