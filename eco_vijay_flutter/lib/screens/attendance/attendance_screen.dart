import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/attendance_model.dart';
import '../../services/api_service.dart';
import '../../services/attendance_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  // ── Clock ──────────────────────────────────────────────────────────────
  Timer? _clockTimer;
  DateTime _now = DateTime.now();

  // ── Location ───────────────────────────────────────────────────────────
  Position? _position;
  double _distanceMetres = double.infinity;
  StreamSubscription<Position>? _positionSub;
  bool _dialogShowing = false;

  // ── Attendance state ───────────────────────────────────────────────────
  String? _activeAttendanceId;
  AttendanceModel? _todayAttendance;
  List<AttendanceModel> _history = [];

  // ── Loading flags ──────────────────────────────────────────────────────
  bool _loading = true;
  bool _actionLoading = false;
  bool _visitLoading = false;

  // ── User info ──────────────────────────────────────────────────────────
  String? _userId;
  String? _userRole;

  // ── Visit note ─────────────────────────────────────────────────────────
  final _visitNoteController = TextEditingController();

  // ── Scroll controller ──────────────────────────────────────────────────
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _startClock();
    _loadUser();
    _startPositionStream();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _positionSub?.cancel();
    _visitNoteController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ── Clock ──────────────────────────────────────────────────────────────

  void _startClock() {
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  // ── Location permission (mirrors HomeScaffold._checkLocation) ──────────

  Future<bool> _ensureLocationPermission() async {
    if (_dialogShowing || !mounted) return false;

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return false;
      _showLocationServicesDialog();
      return false;
    }

    final permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always) {
      return true;
    }

    if (!mounted) return false;

    if (permission == LocationPermission.deniedForever) {
      _showPermissionSettingsDialog();
      return false;
    }

    final allow = await _showRationaleDialog();
    if (allow != true || !mounted) return false;

    final result = await Geolocator.requestPermission();
    if (!mounted) return false;

    if (result == LocationPermission.whileInUse ||
        result == LocationPermission.always) {
      return true;
    } else if (result == LocationPermission.deniedForever) {
      _showPermissionSettingsDialog();
    }
    return false;
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
          'Eco-Vijay needs your location to record attendance check-ins and verify you are at the office.',
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
          'Your device location (GPS) is turned off. Please enable it to record attendance.',
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
          'Location permission is permanently denied. Please enable it in App Settings to record attendance.',
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

  // ── Location stream ────────────────────────────────────────────────────

  void _startPositionStream() async {
    // Silent check only — no dialogs here. HomeScaffold already handles the
    // permission dialog at app startup. Showing dialogs in initState while the
    // Attendance tab is not visible causes them to appear over the Map screen,
    // and if dismissed the stream never starts.
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    final perm = await Geolocator.checkPermission();
    if (perm != LocationPermission.whileInUse &&
        perm != LocationPermission.always) return;

    // Show last-known position immediately — no GPS fix wait required
    final lastKnown = await Geolocator.getLastKnownPosition();
    if (lastKnown != null) _updatePosition(lastKnown);

    // Start live stream UNCONDITIONALLY — never gate on getCurrentPosition
    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );
    _positionSub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_updatePosition, onError: (_) {});

    // LocationService.getCurrentPosition — same method as app startup
    // Fire-and-forget; stream above keeps updating even if this times out
    LocationService.getCurrentPosition().then((pos) {
      if (pos != null && mounted) _updatePosition(pos);
    });
  }

  void _updatePosition(Position pos) {
    final dist = AppConstants.calculateDistanceMetres(
      pos.latitude,
      pos.longitude,
      AppConstants.officeLatitude,
      AppConstants.officeLongitude,
    );

    if (!mounted) return;
    setState(() {
      _position = pos;
      _distanceMetres = dist;
    });
  }

  // ── User & attendance loading ──────────────────────────────────────────

  Future<void> _loadUser() async {
    try {
      final data = await ApiService.get('/users/me');
      _userId = data['id']?.toString();
      _userRole = data['role']?.toString();
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    _activeAttendanceId = prefs.getString(AppConstants.activeAttendanceKey);

    await _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final today = await AttendanceService.getToday();
    final history = await AttendanceService.getHistory();
    if (mounted) {
      setState(() {
        _todayAttendance = today;
        _history = history;
        _loading = false;
      });
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────

  Future<void> _checkIn() async {
    // 1. Permission — same dialog flow as app startup
    final granted = await _ensureLocationPermission();
    if (!granted || !mounted) return;

    setState(() => _actionLoading = true);
    try {
      // 2. Use stream position instantly if available; only wait for GPS if not
      final pos = _position ?? await LocationService.getCurrentPosition();
      if (!mounted) return;
      if (pos == null) {
        _showSnack('Unable to get location. Enable GPS and try again.', isError: true);
        return;
      }

      if (_userId == null) {
        _showSnack('User not loaded yet. Please wait.', isError: true);
        return;
      }

      // 3. Geofence — 100 m (bypassed in debug builds)
      final dist = AppConstants.calculateDistanceMetres(
        pos.latitude, pos.longitude,
        AppConstants.officeLatitude, AppConstants.officeLongitude,
      );
      if (!kDebugMode && dist > AppConstants.geofenceRadiusMetres) {
        _showSnack(
            'You must be within ${AppConstants.geofenceRadiusMetres.toInt()} m of the office to check in.',
            isError: true);
        return;
      }

      // 4. Record
      final now = DateTime.now();
      final result = await AttendanceService.checkIn(
        userId: _userId!,
        checkIn: now,
        lat: pos.latitude,
        lng: pos.longitude,
        date: now,
      );
      final id = result['id']?.toString();
      if (id != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.activeAttendanceKey, id);
        if (mounted) setState(() => _activeAttendanceId = id);
      }
      await _loadAttendance();

      // 5. Success sheet with all info
      if (mounted) _showCheckInSuccessSheet(now, pos);
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _checkOut({bool forceCheckOut = false}) async {
    if (_activeAttendanceId == null) return;

    setState(() => _actionLoading = true);
    try {
      // Use stream position instantly if available; only wait if not
      final pos = _position ?? await LocationService.getCurrentPosition();
      if (!mounted) return;
      if (pos == null) {
        _showSnack('Unable to get location. Enable GPS and try again.', isError: true);
        return;
      }

      // Geofence — 100 m (bypassed in debug builds)
      final dist = AppConstants.calculateDistanceMetres(
        pos.latitude, pos.longitude,
        AppConstants.officeLatitude, AppConstants.officeLongitude,
      );
      if (!kDebugMode && dist > AppConstants.geofenceRadiusMetres) {
        _showSnack(
            'You must be within ${AppConstants.geofenceRadiusMetres.toInt()} m of the office to check out.',
            isError: true);
        return;
      }

      // Check 9-hour requirement before check-out
      if (!forceCheckOut && _todayAttendance != null && _todayAttendance!.checkIn != null) {
        final hoursWorked = DateTime.now().difference(_todayAttendance!.checkIn!).inMinutes / 60;
        if (hoursWorked < 9) {
          if (mounted) {
            setState(() => _actionLoading = false);
            _show9HourAlert(hoursWorked);
          }
          return;
        }
      }

      await AttendanceService.checkOut(
        attendanceId: _activeAttendanceId!,
        checkOut: DateTime.now(),
        lat: pos.latitude,
        lng: pos.longitude,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AppConstants.activeAttendanceKey);
      if (mounted) setState(() => _activeAttendanceId = null);
      _showSnack('Checked out successfully!');
      await _loadAttendance();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _show9HourAlert(double hoursWorked) {
    final totalMinutes = (hoursWorked * 60).toInt();
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;

    final remainingTotal = (9 * 60) - totalMinutes;
    final remainingHours = remainingTotal ~/ 60;
    final remainingMinutes = remainingTotal % 60;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded,
              color: Color(0xFFF59E0B),
              size: 24
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Early Check-Out',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 12),
            const Text(
              'Your 9-hour workday is not complete yet.',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Color(0xFFFCD34D), width: 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Time worked:',
                        style: TextStyle(fontSize: 13, color: Color(0xFF7C2D12)),
                      ),
                      Text(
                        '$hours hr $minutes min',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF7C2D12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Remaining:',
                        style: TextStyle(fontSize: 13, color: Color(0xFF7C2D12)),
                      ),
                      Text(
                        '$remainingHours hr $remainingMinutes min',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF7C2D12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Are you sure you want to check out early?',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(fontSize: 14)),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _forceCheckOut();
            },
            style: FilledButton.styleFrom(
              backgroundColor: Color(0xFFF59E0B),
              foregroundColor: Colors.white,
            ),
            child: const Text('Check Out Anyway'),
          ),
        ],
      ),
    );
  }

  Future<void> _forceCheckOut() async {
    setState(() => _actionLoading = true);
    try {
      final pos = _position ?? await LocationService.getCurrentPosition();
      if (!mounted) return;
      if (pos == null) {
        _showSnack('Unable to get location. Enable GPS and try again.', isError: true);
        return;
      }

      await AttendanceService.checkOut(
        attendanceId: _activeAttendanceId!,
        checkOut: DateTime.now(),
        lat: pos.latitude,
        lng: pos.longitude,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AppConstants.activeAttendanceKey);
      if (mounted) setState(() => _activeAttendanceId = null);
      _showSnack('Checked out successfully!');
      await _loadAttendance();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _logVisit() async {
    if (_position == null) {
      _showSnack('Cannot determine your location.', isError: true);
      return;
    }
    if (_userId == null) return;
    setState(() => _visitLoading = true);
    try {
      await AttendanceService.logVisit(
        userId: _userId!,
        lat: _position!.latitude,
        lng: _position!.longitude,
        visitedAt: DateTime.now(),
        note: _visitNoteController.text.trim(),
      );
      _visitNoteController.clear();
      _showSnack('Visit logged successfully!');
      await _loadAttendance();
    } catch (e) {
      _showSnack(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _visitLoading = false);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.danger : AppColors.success,
      ),
    );
  }

  // ── Check-in success sheet ─────────────────────────────────────────────

  void _showCheckInSuccessSheet(DateTime checkInTime, Position position) {
    final timeStr = DateFormat('HH:mm').format(checkInTime);
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(checkInTime);
    final latStr = position.latitude.toStringAsFixed(6);
    final lngStr = position.longitude.toStringAsFixed(6);
    final distStr = _distanceDisplay;
    final statusStr = kDebugMode
        ? 'Debug — geofence bypassed'
        : _distanceMetres <= AppConstants.geofenceRadiusMetres
            ? 'Within office zone'
            : 'Outside office zone';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle,
                  color: AppColors.success, size: 32),
            ),
            const SizedBox(height: 12),
            const Text(
              'Checked In Successfully',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            _SheetRow(
                icon: Icons.access_time, label: 'Time', value: timeStr),
            _SheetRow(
                icon: Icons.calendar_today, label: 'Date', value: dateStr),
            _SheetRow(
                icon: Icons.my_location, label: 'Latitude', value: latStr),
            _SheetRow(
                icon: Icons.my_location, label: 'Longitude', value: lngStr),
            _SheetRow(
                icon: Icons.straighten, label: 'Distance', value: distStr),
            _SheetRow(
                icon: Icons.location_on, label: 'Status', value: statusStr),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(sheetCtx),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }

  // ── Computed helpers ───────────────────────────────────────────────────

  bool get _isCheckedIn => _activeAttendanceId != null;

  // In debug builds (flutter run) geofence is bypassed so developers can
  // test check-in/out without physically being at the office.
  // Release builds always enforce the radius.
  bool get _isWithinGeofence =>
      kDebugMode || _distanceMetres <= AppConstants.geofenceRadiusMetres;

  bool get _canCheckIn =>
      !_isCheckedIn && _isWithinGeofence && _position != null;

  String get _distanceDisplay {
    if (_distanceMetres == double.infinity) return '--';
    if (_distanceMetres >= 1000) {
      return '${(_distanceMetres / 1000).toStringAsFixed(2)} km';
    }
    return '${_distanceMetres.toStringAsFixed(0)} m';
  }

  // ── Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        automaticallyImplyLeading: false,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.primary)))
          : Column(
              children: [
                _buildTopSection(),
                Expanded(
                  child: SingleChildScrollView(
                    controller: _scrollController,
                    padding: const EdgeInsets.only(bottom: 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 16),
                        _buildCheckInOutButton(),
                        const SizedBox(height: 16),
                        _buildTodaySummaryCard(),
                        if (_userRole == 'field_agent' || _userRole == 'agent') ...[
                          const SizedBox(height: 8),
                          _buildLogVisitSection(),
                        ],
                        const SizedBox(height: 8),
                        _buildHistorySection(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  // ── Top section (clock + geofence arc) ────────────────────────────────

  Widget _buildTopSection() {
    final clockStr = DateFormat('HH:mm:ss').format(_now);
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(_now);

    return Container(
      color: AppColors.primary,
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  clockStr,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 38,
                    fontWeight: FontWeight.w700,
                    fontFeatures: [FontFeature.tabularFigures()],
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  dateStr,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.75),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: _isWithinGeofence
                        ? AppColors.success.withOpacity(0.25)
                        : AppColors.danger.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _isWithinGeofence
                          ? AppColors.success
                          : AppColors.danger,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isWithinGeofence
                            ? Icons.location_on
                            : Icons.location_off,
                        size: 14,
                        color: _isWithinGeofence
                            ? AppColors.success
                            : AppColors.danger,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _isWithinGeofence
                            ? 'Within office zone'
                            : 'Outside office zone',
                        style: TextStyle(
                          color: _isWithinGeofence
                              ? AppColors.success
                              : AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Current distance from office: $_distanceDisplay',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          _GeofenceArc(
            distanceMetres: _distanceMetres,
            radiusMetres: AppConstants.geofenceRadiusMetres,
            size: 110,
          ),
        ],
      ),
    );
  }

  // ── Check-in/out button ────────────────────────────────────────────────

  Widget _buildCheckInOutButton() {
    Widget button;

    if (_actionLoading) {
      button = Container(
        height: 52,
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
                color: Colors.white, strokeWidth: 2.5),
          ),
        ),
      );
    } else if (_isCheckedIn) {
      button = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: ElevatedButton.icon(
          onPressed: _checkOut,
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Check Out'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 52),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    } else if (_position == null) {
      button = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            ElevatedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.login, size: 18),
              label: const Text('Check In'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Waiting for GPS location...',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    } else if (!_isWithinGeofence) {
      button = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            ElevatedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.login, size: 18),
              label: const Text('Check In'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'You must be within ${AppConstants.geofenceRadiusMetres.toInt()}m of the office to check in.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    } else {
      button = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: ElevatedButton.icon(
          onPressed: _canCheckIn ? _checkIn : null,
          icon: const Icon(Icons.login, size: 18),
          label: const Text('Check In'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.success,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 52),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }

    return button;
  }

  // ── Today's summary ────────────────────────────────────────────────────

  Widget _buildTodaySummaryCard() {
    final t = _todayAttendance;
    final checkInStr = t?.checkIn != null
        ? DateFormat('HH:mm').format(t!.checkIn!)
        : '--:--';
    final checkOutStr = t?.checkOut != null
        ? DateFormat('HH:mm').format(t!.checkOut!)
        : '--:--';
    final hoursStr = t?.hoursDisplay ?? '--';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
              color: Color(0x0A000000), blurRadius: 6, offset: Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Today's Summary",
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: AppColors.textPrimary),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _SummaryItem(
                  icon: Icons.login,
                  label: 'Check In',
                  value: checkInStr,
                  color: AppColors.success),
              const SizedBox(width: 12),
              _SummaryItem(
                  icon: Icons.logout,
                  label: 'Check Out',
                  value: checkOutStr,
                  color: AppColors.danger),
              const SizedBox(width: 12),
              _SummaryItem(
                  icon: Icons.access_time,
                  label: 'Hours',
                  value: hoursStr,
                  color: AppColors.primary),
            ],
          ),
        ],
      ),
    );
  }

  // ── Log visit section ──────────────────────────────────────────────────

  Widget _buildLogVisitSection() {
    final visits = _todayAttendance?.visitLogs ?? [];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Log Visit',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: AppColors.textPrimary),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _visitNoteController,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'Note (optional)',
              hintStyle: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 2),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _visitLoading ? null : _logVisit,
              icon: _visitLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.primary))
                  : const Icon(Icons.add_location_alt_outlined, size: 18),
              label: const Text('Log Visit'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          if (visits.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              "Today's Visits",
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary),
            ),
            const SizedBox(height: 6),
            ...visits.map((v) => _VisitLogItem(visit: v)),
          ],
        ],
      ),
    );
  }

  // ── History section ────────────────────────────────────────────────────

  Widget _buildHistorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 6),
          child: Text(
            'Last 30 Days',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary),
          ),
        ),
        if (_history.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              'No attendance records found.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          )
        else
          ...(_history.map((item) => _HistoryItem(record: item)).toList()),
      ],
    );
  }
}

// ── _SheetRow ─────────────────────────────────────────────────────────────────

class _SheetRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SheetRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── _SummaryItem ─────────────────────────────────────────────────────────────

class _SummaryItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: color,
                  fontFeatures: const [FontFeature.tabularFigures()]),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

// ── _VisitLogItem ─────────────────────────────────────────────────────────────

class _VisitLogItem extends StatelessWidget {
  final VisitLog visit;
  const _VisitLogItem({required this.visit});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_pin, size: 16, color: AppColors.accent),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  DateFormat('HH:mm').format(visit.visitedAt),
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary),
                ),
                if (visit.note != null && visit.note!.isNotEmpty)
                  Text(
                    visit.note!,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── _HistoryItem ──────────────────────────────────────────────────────────────

class _HistoryItem extends StatelessWidget {
  final AttendanceModel record;
  const _HistoryItem({required this.record});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEE, d MMM').format(record.date);
    final checkInStr = record.checkIn != null
        ? DateFormat('HH:mm').format(record.checkIn!)
        : '--:--';
    final checkOutStr = record.checkOut != null
        ? DateFormat('HH:mm').format(record.checkOut!)
        : '--:--';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 42,
            decoration: BoxDecoration(
              color: record.statusColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dateStr,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: record.statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    record.statusLabel,
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: record.statusColor),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _TimeChip(
                        label: 'IN',
                        time: checkInStr,
                        color: AppColors.success),
                    _TimeChip(
                        label: 'OUT',
                        time: checkOutStr,
                        color: AppColors.danger),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'IN: ${record.checkInCoords}',
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'OUT: ${record.checkOutCoords}',
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          SizedBox(
            width: 52,
            child: Text(
              record.hoursDisplay,
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  final String label;
  final String time;
  final Color color;
  const _TimeChip(
      {required this.label, required this.time, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 9, fontWeight: FontWeight.w700, color: color)),
        Text(time,
            style: const TextStyle(
                fontSize: 12,
                color: AppColors.textPrimary,
                fontFeatures: [FontFeature.tabularFigures()])),
      ],
    );
  }
}

// ── _GeofenceArc ──────────────────────────────────────────────────────────────

class _GeofenceArc extends StatelessWidget {
  final double distanceMetres;
  final double radiusMetres;
  final double size;

  const _GeofenceArc({
    required this.distanceMetres,
    required this.radiusMetres,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GeofencePainter(
          distanceMetres: distanceMetres,
          radiusMetres: radiusMetres,
        ),
      ),
    );
  }
}

class _GeofencePainter extends CustomPainter {
  final double distanceMetres;
  final double radiusMetres;

  _GeofencePainter({
    required this.distanceMetres,
    required this.radiusMetres,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;

    final bgPaint = Paint()
      ..color = Colors.white.withOpacity(0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    final bool hasLocation = distanceMetres != double.infinity;
    final double progress = hasLocation
        ? (1.0 - math.min(1.0, distanceMetres / radiusMetres))
        : 0.0;

    if (progress > 0) {
      final arcPaint = Paint()
        ..color = progress >= 1.0 ? AppColors.success : AppColors.accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        progress * 2 * math.pi,
        false,
        arcPaint,
      );
    }

    final textPainter = TextPainter(
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );

    String distLabel;
    String distUnit;
    if (!hasLocation) {
      distLabel = '--';
      distUnit = 'm';
    } else if (distanceMetres >= 1000) {
      distLabel = (distanceMetres / 1000).toStringAsFixed(1);
      distUnit = 'km';
    } else {
      distLabel = distanceMetres.toStringAsFixed(0);
      distUnit = 'm';
    }

    textPainter.text = TextSpan(
      text: distLabel,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(center.dx - textPainter.width / 2,
          center.dy - textPainter.height / 2 - 8),
    );

    textPainter.text = TextSpan(
      text: distUnit,
      style: TextStyle(
        color: Colors.white.withOpacity(0.7),
        fontSize: 11,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(center.dx - textPainter.width / 2,
          center.dy + textPainter.height / 2 + 2),
    );
  }

  @override
  bool shouldRepaint(_GeofencePainter old) =>
      old.distanceMetres != distanceMetres;
}
