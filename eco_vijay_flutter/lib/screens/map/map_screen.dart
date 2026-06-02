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
  List<CompanyModel> _allCompanies = [];
  Set<Marker> _markers = {};
  bool _loading = true;
  final TextEditingController _searchController = TextEditingController();
  List<CompanyModel> _searchResults = [];
  final DraggableScrollableController _sheetController =
      DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    widget.locationGranted?.addListener(_onLocationGranted);
    if (widget.locationGranted?.value == true) {
      _initLocation();
    }
    // Always load all companies for the map even before location is known
    _loadAllCompanies();
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
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(
        LatLng(position.latitude, position.longitude),
        10,
      ),
    );
    await _loadNearbyCompanies();
  }

  Future<void> _loadAllCompanies() async {
    try {
      final data = await ApiService.get('/companies');
      if (!mounted) return;
      final companies =
          (data as List).map((e) => CompanyModel.fromJson(e)).toList();
      setState(() {
        _allCompanies = companies;
        _markers = _buildMarkers();
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadNearbyCompanies() async {
    if (_currentPosition == null) return;
    try {
      final data = await ApiService.get(
        '/companies/nearby?lat=${_currentPosition!.latitude}'
        '&lng=${_currentPosition!.longitude}'
        '&radius=70',
      );
      if (!mounted) return;
      final companies =
          (data as List).map((e) => CompanyModel.fromJson(e)).toList();
      setState(() {
        _nearbyCompanies = companies;
        _markers = _buildMarkers();
      });
    } catch (e) {
      // nearby failed – map still shows all companies
    }
  }

  Set<Marker> _buildMarkers() {
    final nearbyIds = _nearbyCompanies.map((c) => c.id).toSet();

    // Merge: start with all companies, override with nearby (which have distance)
    final Map<String, CompanyModel> byId = {
      for (final c in _allCompanies) c.id: c,
      for (final c in _nearbyCompanies) c.id: c,
    };

    return byId.values
        .where((c) => c.latitude != null && c.longitude != null)
        .map((c) {
      final isNearby = nearbyIds.contains(c.id);
      return Marker(
        markerId: MarkerId(c.id),
        position: LatLng(c.latitude!, c.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          isNearby
              ? _hueForLeadStatus(c.leadStatus)
              : BitmapDescriptor.hueAzure,
        ),
        infoWindow: InfoWindow(
          title: c.name,
          snippet: isNearby && c.distanceKm != null
              ? '${c.distanceKm!.toStringAsFixed(1)} km away'
              : c.city ?? '',
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
        return BitmapDescriptor.hueOrange;
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
      });
      return;
    }
    try {
      final data = await ApiService.get(
          '/companies?search=${Uri.encodeComponent(query.trim())}');
      if (!mounted) return;
      setState(() {
        _searchResults =
            (data as List).map((e) => CompanyModel.fromJson(e)).toList();
      });
    } catch (_) {}
  }

  void _openCompany(CompanyModel company) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CompanyDetailScreen(companyId: company.id),
      ),
    );
  }

  void _fitAllMarkers() {
    if (_markers.isEmpty || _mapController == null) return;
    double minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (final m in _markers) {
      final pos = m.position;
      if (pos.latitude < minLat) minLat = pos.latitude;
      if (pos.latitude > maxLat) maxLat = pos.latitude;
      if (pos.longitude < minLng) minLng = pos.longitude;
      if (pos.longitude > maxLng) maxLng = pos.longitude;
    }
    _mapController!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat - 0.5, minLng - 0.5),
          northeast: LatLng(maxLat + 0.5, maxLng + 0.5),
        ),
        60,
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
            onMapCreated: (c) {
              _mapController = c;
              // Fit all markers once map is ready
              if (_markers.isNotEmpty) {
                Future.delayed(const Duration(milliseconds: 300), _fitAllMarkers);
              }
            },
            initialCameraPosition:
                CameraPosition(target: initialTarget, zoom: 5),
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
                          hintStyle: TextStyle(
                              fontSize: 13, color: AppColors.textSecondary),
                          prefixIcon: Icon(Icons.search,
                              color: AppColors.textSecondary, size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Fit-all button
                  GestureDetector(
                    onTap: _fitAllMarkers,
                      child: Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Colors.black12, blurRadius: 6)
                        ],
                      ),
                      child: const Icon(Icons.fit_screen,
                          color: AppColors.primary, size: 20),
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
                padding: const EdgeInsets.only(top: 62, left: 80, right: 60),
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
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20)),
                  boxShadow: [
                    BoxShadow(color: Colors.black12, blurRadius: 10)
                  ],
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
                          const SizedBox(width: 6),
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
                          const Spacer(),
                          Text(
                            'within 70 km  •  ${_allCompanies.length} total',
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary),
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
                              ? Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.location_off,
                                          size: 40,
                                          color: AppColors.textSecondary),
                                      const SizedBox(height: 8),
                                      Text(
                                        _currentPosition == null
                                            ? 'Enable location to see nearby companies'
                                            : 'No companies within 70 km',
                                        style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 13),
                                      ),
                                      if (_allCompanies.isNotEmpty)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 4),
                                          child: Text(
                                            '${_allCompanies.length} companies shown on map',
                                            style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.primary),
                                          ),
                                        ),
                                    ],
                                  ),
                                )
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
                                          ? Column(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.end,
                                              children: [
                                                Text(
                                                  '${c.distanceKm!.toStringAsFixed(1)} km',
                                                  style: const TextStyle(
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      color: AppColors.primary),
                                                ),
                                                if (c.leadStatus != null)
                                                  Text(
                                                    c.leadStatus!,
                                                    style: const TextStyle(
                                                        fontSize: 10,
                                                        color: AppColors
                                                            .textSecondary),
                                                  ),
                                              ],
                                            )
                                          : null,
                                      onTap: () {
                                        _openCompany(c);
                                        if (c.latitude != null &&
                                            c.longitude != null) {
                                          _mapController?.animateCamera(
                                            CameraUpdate.newLatLngZoom(
                                              LatLng(c.latitude!, c.longitude!),
                                              14,
                                            ),
                                          );
                                        }
                                      },
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
