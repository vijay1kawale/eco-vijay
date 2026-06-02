import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/splash/splash_screen.dart';
import 'screens/login/login_screen.dart';
import 'screens/home/home_scaffold.dart';
import 'services/auth_service.dart';
import 'services/geofence_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EcoVijayApp());
}

class EcoVijayApp extends StatefulWidget {
  const EcoVijayApp({super.key});

  @override
  State<EcoVijayApp> createState() => _EcoVijayAppState();
}

class _EcoVijayAppState extends State<EcoVijayApp> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
    GeofenceService.autoCheckoutMessage.addListener(_onAutoCheckout);
  }

  @override
  void dispose() {
    GeofenceService.autoCheckoutMessage.removeListener(_onAutoCheckout);
    GeofenceService.stop();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final loggedIn = await AuthService.isLoggedIn();
    if (loggedIn) {
      GeofenceService.start();
    }
  }

  void _onAutoCheckout() {
    final msg = GeofenceService.autoCheckoutMessage.value;
    if (msg == null) return;
    final ctx = navigatorKey.currentContext;
    if (ctx != null) {
      ScaffoldMessenger.of(ctx).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.warning,
          duration: const Duration(seconds: 4),
        ),
      );
    }
    // Reset the notifier so repeated exits don't re-fire the same message
    GeofenceService.autoCheckoutMessage.value = null;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eco-Vijay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      navigatorKey: navigatorKey,
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/map': (_) => const HomeScaffold(),
      },
    );
  }
}
