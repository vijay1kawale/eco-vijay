import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../map/map_screen.dart';
import '../sent_quotations/sent_quotations_screen.dart';
import '../profile/profile_screen.dart';
import '../attendance/attendance_screen.dart';
import '../visit_log/visit_log_screen.dart';

class HomeScaffold extends StatefulWidget {
  const HomeScaffold({super.key});

  @override
  State<HomeScaffold> createState() => _HomeScaffoldState();
}

class _HomeScaffoldState extends State<HomeScaffold> with WidgetsBindingObserver {
  final GlobalKey<SentQuotationsScreenState> _sentQuotationsKey = GlobalKey();
  int _currentIndex = 0;
  final ValueNotifier<bool> _locationGranted = ValueNotifier(false);
  bool _dialogShowing = false; // prevent dialog stacking
  String? _userRole;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadUserRole();
      await _checkLocation();
    });
  }

  Future<void> _loadUserRole() async {
    final role = await AuthService.getUserRole();
    setState(() {
      _userRole = role;
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _locationGranted.dispose();
    super.dispose();
  }

  // Re-check every time app comes back to foreground (e.g. returning from Settings)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkLocation();
    }
  }

  Future<void> _checkLocation() async {
    if (_dialogShowing || !mounted) return;

    // Step 1: Check if location services (GPS) are enabled
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      _locationGranted.value = false;
      _showLocationServicesDialog();
      return;
    }

    // Step 2: Check permission
    final permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always) {
      _locationGranted.value = true;
      return;
    }

    if (!mounted) return;

    if (permission == LocationPermission.deniedForever) {
      _showPermissionSettingsDialog();
      return;
    }

    // Step 3: Denied — show rationale then system prompt
    final allow = await _showRationaleDialog();
    if (allow != true || !mounted) return;

    final result = await Geolocator.requestPermission();
    if (!mounted) return;

    if (result == LocationPermission.whileInUse ||
        result == LocationPermission.always) {
      _locationGranted.value = true;
    } else if (result == LocationPermission.deniedForever) {
      _showPermissionSettingsDialog();
    }
  }

  Future<bool?> _showRationaleDialog() async {
    _dialogShowing = true;
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.location_on, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Location Access'),
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
    _dialogShowing = false;
    return result;
  }

  void _showLocationServicesDialog() {
    if (_dialogShowing) return;
    _dialogShowing = true;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.location_disabled, color: Colors.orange[700]),
            const SizedBox(width: 8),
            const Text('Location is Off'),
          ],
        ),
        content: const Text(
          'Your device location (GPS) is turned off. Please enable it so Eco-Vijay can show nearby companies and record attendance.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _dialogShowing = false;
            },
            child: const Text('Skip'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _dialogShowing = false;
              Geolocator.openLocationSettings();
            },
            child: const Text('Enable Location'),
          ),
        ],
      ),
    ).then((_) => _dialogShowing = false);
  }

  void _showPermissionSettingsDialog() {
    if (_dialogShowing) return;
    _dialogShowing = true;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.location_off, color: Colors.red[400]),
            const SizedBox(width: 8),
            const Text('Permission Denied'),
          ],
        ),
        content: const Text(
          'Location permission is permanently denied. Please enable it in App Settings to use the map and attendance features.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _dialogShowing = false;
            },
            child: const Text('Skip'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _dialogShowing = false;
              Geolocator.openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    ).then((_) => _dialogShowing = false);
  }

  @override
  Widget build(BuildContext context) {
    // Determine which screens to show based on role
    final isFieldUser = _userRole == 'field_agent' || _userRole == 'field';

    List<Widget> screens;
    List<NavigationDestination> navDestinations;

    if (isFieldUser) {
      // Field user sees: Map, Quotations, Visit Log, Attendance, Profile
      screens = [
        MapScreen(locationGranted: _locationGranted),
        SentQuotationsScreen(key: _sentQuotationsKey),
        const VisitLogScreen(),
        const AttendanceScreen(),
        const ProfileScreen(),
      ];
      navDestinations = const [
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
          icon: Icon(Icons.business_outlined),
          selectedIcon: Icon(Icons.business),
          label: 'Visits',
        ),
        NavigationDestination(
          icon: Icon(Icons.event_note_outlined),
          selectedIcon: Icon(Icons.event_note),
          label: 'Attendance',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ];
    } else {
      // Office user sees: Attendance, Profile
      screens = [
        const AttendanceScreen(),
        const ProfileScreen(),
      ];
      navDestinations = const [
        NavigationDestination(
          icon: Icon(Icons.event_note_outlined),
          selectedIcon: Icon(Icons.event_note),
          label: 'Attendance',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ];
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) {
          setState(() => _currentIndex = i);
          if (isFieldUser && i == 1) {
            _sentQuotationsKey.currentState?.refresh();
          }
        },
        destinations: navDestinations,
      ),
    );
  }
}
