import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme/app_theme.dart';
import '../map/map_screen.dart';
import '../sent_quotations/sent_quotations_screen.dart';
import '../profile/profile_screen.dart';
import '../attendance/attendance_screen.dart';

class HomeScaffold extends StatefulWidget {
  const HomeScaffold({super.key});

  @override
  State<HomeScaffold> createState() => _HomeScaffoldState();
}

class _HomeScaffoldState extends State<HomeScaffold> {
  int _currentIndex = 0;
  final ValueNotifier<bool> _locationGranted = ValueNotifier(false);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkLocationPermission());
  }

  @override
  void dispose() {
    _locationGranted.dispose();
    super.dispose();
  }

  Future<void> _checkLocationPermission() async {
    final permission = await Geolocator.checkPermission();

    // Already granted — signal map immediately
    if (permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always) {
      _locationGranted.value = true;
      return;
    }

    if (!mounted) return;

    if (permission == LocationPermission.deniedForever) {
      _showSettingsDialog();
      return;
    }

    // Denied — show rationale dialog first
    final allow = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.location_on, color: AppColors.primary),
            const SizedBox(width: 8),
            const Text('Location Access'),
          ],
        ),
        content: const Text(
          'Eco-Vijay needs your location to show nearby companies on the map and record attendance check-ins.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not Now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Allow'),
          ),
        ],
      ),
    );

    if (allow != true || !mounted) return;

    // Trigger Android system permission prompt
    final result = await Geolocator.requestPermission();
    if (!mounted) return;

    if (result == LocationPermission.whileInUse ||
        result == LocationPermission.always) {
      // Permission granted — signal map to fetch location
      _locationGranted.value = true;
    } else if (result == LocationPermission.deniedForever) {
      _showSettingsDialog();
    }
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.location_off, color: Colors.orange[700]),
            const SizedBox(width: 8),
            const Text('Permission Required'),
          ],
        ),
        content: const Text(
          'Location permission was denied. Please enable it in Settings to use the map and attendance features.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Skip'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              Geolocator.openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      MapScreen(locationGranted: _locationGranted),
      const SentQuotationsScreen(),
      const ProfileScreen(),
      const AttendanceScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Map',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description),
            label: 'Quotations',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note),
            label: 'Attendance',
          ),
        ],
      ),
    );
  }
}
