import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/location_service.dart';
import '../../models/company_model.dart';
import '../company_detail/company_detail_screen.dart';

class MapScreen extends StatefulWidget {
  final ValueNotifier<bool>? locationGranted;
  const MapScreen({super.key, this.locationGranted});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  String _currentArea = 'Locating...';
  List<CompanyModel> _nearbyCompanies = [];
  Set<Marker> _markers = {};
  bool _loading = true;
  final TextEditingController _searchController = TextEditingController();
  List<CompanyModel> _searchResults = [];
  bool _searching = false;
  final DraggableScrollableController _sheetController =
      DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    // Listen for permission grant signal from HomeScaffold
    widget.locationGranted?.addListener(_onLocationGranted);
    // If permission already granted when screen loads, fetch immediately
    if (widget.locationGranted?.value == true) {
      _initLocation();
    }
  }

  @override
  void dispose() {
    widget.locationGranted?.removeListener(_onLocationGranted);
    _searchController.dispose();
    _sheetController.dispose();
    super.dispose();
  }

  void _onLocationGranted() {
    if (widget.locationGranted?.value == true && _currentPosition == null) {
      _initLocation();
    }
  }

  Future<void> _initLocation() async {
    final position = await LocationService.getCurrentPosition();
    if (!mounted) return;
    if (position == null) {
      setState(() {
        _loading = false;
        _currentArea = 'Location unavailable';
      });
      return;
    }
    final area = await LocationService.getCityFromCoords(
        position.latitude, position.longitude);
    if (!mounted) return;
    setState(() {
      _currentPosition = position;
      _currentArea = area;
    });
    // Move camera to user's current location
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(
        LatLng(position.latitude, position.longitude),
        14,
      ),
    );
    await _loadNearbyCompanies();
  }

  Future<void> _loadNearbyCompanies() async {
    if (_currentPosition == null) return;
    setState(() => _loading = true);
    try {
      final data = await ApiService.get(
        '/companies/nearby?lat=${_currentPosition!.latitude}'
        '&lng=${_currentPosition!.longitude}'
        '&radius=10',
      );
      final companies =
          (data as List).map((e) => CompanyModel.fromJson(e)).toList();
      setState(() {
        _nearbyCompanies = companies;
        _markers = _buildMarkers(companies);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Set<Marker> _buildMarkers(List<CompanyModel> companies) {
    return companies
        .where((c) => c.latitude != null && c.longitude != null)
        .map((c) {
      return Marker(
        markerId: MarkerId(c.id),
        position: LatLng(c.latitude!, c.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
            _hueForLeadStatus(c.leadStatus)),
        infoWindow: InfoWindow(
          title: c.name,
          snippet: c.leadStatus ?? 'No status',
          onTap: () => _openCompany(c),
        ),
      );
    }).toSet();
  }

  double _hueForLeadStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'prospect':
        return BitmapDescriptor.hueBlue;
      case 'contacted':
        return BitmapDescriptor.hueYellow;
      case 'interested':
      case 'negotiation':
        return BitmapDescriptor.hueGreen;
      case 'closed':
        return BitmapDescriptor.hueViolet;
      case 'lost':
        return BitmapDescriptor.hueRed;
      default:
        return BitmapDescriptor.hueAzure;
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    try {
      final data =
          await ApiService.get('/companies?search=${Uri.encodeComponent(query.trim())}');
      setState(() {
        _searchResults =
            (data as List).map((e) => CompanyModel.fromJson(e)).toList();
      });
    } catch (_) {}
    setState(() => _searching = false);
  }

  void _openCompany(CompanyModel company) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CompanyDetailScreen(companyId: company.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final initialTarget = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : const LatLng(20.5937, 78.9629); // Centre of India

    return Scaffold(
      body: Stack(
        children: [
          // Map
          GoogleMap(
            onMapCreated: (c) => _mapController = c,
            initialCameraPosition: CameraPosition(target: initialTarget, zoom: 13),
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            markers: _markers,
            zoomControlsEnabled: false,
          ),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // City chip
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(color: Colors.black12, blurRadius: 6)
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on,
                            color: AppColors.primary, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          _currentArea,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Search bar
                  Expanded(
                    child: Container(
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [
                          BoxShadow(color: Colors.black12, blurRadius: 6)
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: _search,
                        decoration: const InputDecoration(
                          hintText: 'Search companies...',
                          hintStyle:
                              TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          prefixIcon:
                              Icon(Icons.search, color: AppColors.textSecondary, size: 20),
                          border: InputBorder.none,
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Search results dropdown
          if (_searchResults.isNotEmpty)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: 62, left: 80, right: 12),
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 250),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(color: Colors.black12, blurRadius: 8)
                    ],
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _searchResults.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, color: AppColors.border),
                    itemBuilder: (_, i) {
                      final c = _searchResults[i];
                      return ListTile(
                        dense: true,
                        title: Text(c.name,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600)),
                        subtitle: Text(c.city ?? '',
                            style: const TextStyle(fontSize: 12)),
                        onTap: () {
                          _searchController.clear();
                          setState(() => _searchResults = []);
                          _openCompany(c);
                        },
                      );
                    },
                  ),
                ),
              ),
            ),

          // Bottom draggable panel
          DraggableScrollableSheet(
            controller: _sheetController,
            initialChildSize: 0.28,
            minChildSize: 0.12,
            maxChildSize: 0.65,
            builder: (context, scrollController) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          const Text(
                            'Nearby Companies',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${_nearbyCompanies.length}',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: _loading
                          ? const Center(
                              child: CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      AppColors.primary)))
                          : _nearbyCompanies.isEmpty
                              ? const Center(
                                  child: Text('No companies found nearby',
                                      style:
                                          TextStyle(color: AppColors.textSecondary)))
                              : ListView.separated(
                                  controller: scrollController,
                                  itemCount: _nearbyCompanies.length,
                                  separatorBuilder: (_, __) => const Divider(
                                      height: 1, color: AppColors.border),
                                  itemBuilder: (_, i) {
                                    final c = _nearbyCompanies[i];
                                    return ListTile(
                                      leading: _CompanyAvatar(company: c),
                                      title: Text(
                                        c.name,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      subtitle: Text(
                                        [c.city, c.industry]
                                            .where((s) =>
                                                s != null && s.isNotEmpty)
                                            .join(' • '),
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary),
                                      ),
                                      trailing: c.distanceKm != null
                                          ? Text(
                                              '${c.distanceKm!.toStringAsFixed(1)} km',
                                              style: const TextStyle(
                                                  fontSize: 12,
                                                  color: AppColors.textSecondary),
                                            )
                                          : null,
                                      onTap: () => _openCompany(c),
                                    );
                                  },
                                ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CompanyAvatar extends StatelessWidget {
  final CompanyModel company;
  const _CompanyAvatar({required this.company});

  @override
  Widget build(BuildContext context) {
    if (company.logoUrl != null && company.logoUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 22,
        backgroundColor: AppColors.border,
        child: ClipOval(
          child: Image.network(
            company.logoUrl!,
            width: 44,
            height: 44,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _fallback(),
          ),
        ),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    return CircleAvatar(
      radius: 22,
      backgroundColor: AppColors.primary.withOpacity(0.1),
      child: Text(
        company.name.isNotEmpty ? company.name[0].toUpperCase() : '?',
        style: const TextStyle(
            color: AppColors.primary, fontWeight: FontWeight.bold),
      ),
    );
  }
}
