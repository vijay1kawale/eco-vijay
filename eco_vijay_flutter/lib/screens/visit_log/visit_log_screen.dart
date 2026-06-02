import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class VisitLogScreen extends StatefulWidget {
  const VisitLogScreen({super.key});

  @override
  State<VisitLogScreen> createState() => _VisitLogScreenState();
}

class _VisitLogScreenState extends State<VisitLogScreen> {
  final _formKey = GlobalKey<FormState>();
  final _companyNameController = TextEditingController();
  bool _loading = false;
  File? _selectedImage;
  Position? _currentPosition;
  String? _errorMessage;
  String? _successMessage;
  List<Map<String, dynamic>> _visits = [];
  bool _loadingVisits = true;

  @override
  void initState() {
    super.initState();
    _loadVisits();
  }

  @override
  void dispose() {
    _companyNameController.dispose();
    super.dispose();
  }

  Future<void> _loadVisits() async {
    setState(() => _loadingVisits = true);
    try {
      final userData = await AuthService.getUserData();
      if (userData == null) return;

      final response = await ApiService.get('/visits?user_id=${userData['id']}');
      if (response is List) {
        setState(() {
          _visits = List<Map<String, dynamic>>.from(response);
        });
      }
    } catch (e) {
      debugPrint('Error loading visits: $e');
    } finally {
      if (mounted) setState(() => _loadingVisits = false);
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition();
      setState(() => _currentPosition = position);
    } catch (e) {
      _showError('Failed to get location: $e');
    }
  }

  Future<void> _pickImage() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
      if (pickedFile != null) {
        setState(() => _selectedImage = File(pickedFile.path));
      }
    } catch (e) {
      _showError('Failed to pick image: $e');
    }
  }

  Future<void> _takePhoto() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.camera);
      if (pickedFile != null) {
        setState(() => _selectedImage = File(pickedFile.path));
      }
    } catch (e) {
      _showError('Failed to take photo: $e');
    }
  }

  Future<void> _submitVisit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_currentPosition == null) {
      _showError('Location is required. Please get your location first.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final userData = await AuthService.getUserData();
      if (userData == null) {
        _showError('User data not found');
        return;
      }

      // Create form data
      final formData = <String, String>{
        'user_id': userData['id'] ?? '',
        'company_name': _companyNameController.text.trim(),
        'visited_at': DateTime.now().toUtc().toIso8601String(),
        'latitude': _currentPosition!.latitude.toString(),
        'longitude': _currentPosition!.longitude.toString(),
      };

      Map<String, dynamic> response;
      if (_selectedImage != null) {
        response = await ApiService.postWithFile(
          '/visits',
          formData,
          _selectedImage!,
          'photo',
        );
      } else {
        response = await ApiService.post('/visits', formData);
      }

      setState(() {
        _successMessage = 'Visit logged successfully!';
        _companyNameController.clear();
        _selectedImage = null;
        _currentPosition = null;
      });

      // Reload visits
      await _loadVisits();

      // Clear success message after 3 seconds
      await Future.delayed(const Duration(seconds: 3));
      if (mounted) {
        setState(() => _successMessage = null);
      }
    } catch (e) {
      _showError('Failed to log visit: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String message) {
    setState(() => _errorMessage = message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.danger,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Log Visit'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Form Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'New Visit',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _companyNameController,
                        decoration: const InputDecoration(
                          labelText: 'Company Name',
                          hintText: 'Enter company name',
                          prefixIcon: Icon(Icons.business),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Company name is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      // Location status
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _currentPosition != null
                              ? AppColors.success.withOpacity(0.1)
                              : Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _currentPosition != null
                                ? AppColors.success.withOpacity(0.5)
                                : Colors.orange.withOpacity(0.5),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _currentPosition != null
                                  ? Icons.location_on
                                  : Icons.location_off,
                              color: _currentPosition != null
                                  ? AppColors.success
                                  : Colors.orange,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _currentPosition == null
                                        ? 'Location not captured'
                                        : 'Location captured',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: _currentPosition != null
                                          ? AppColors.success
                                          : Colors.orange,
                                    ),
                                  ),
                                  if (_currentPosition != null)
                                    Text(
                                      '${_currentPosition!.latitude.toStringAsFixed(4)}, ${_currentPosition!.longitude.toStringAsFixed(4)}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: _getCurrentLocation,
                        icon: const Icon(Icons.my_location),
                        label: const Text('Get Current Location'),
                      ),
                      const SizedBox(height: 16),
                      // Photo section
                      const Text(
                        'Photo (Optional)',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      if (_selectedImage != null)
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                _selectedImage!,
                                height: 200,
                                width: double.infinity,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: FloatingActionButton.small(
                                onPressed: () {
                                  setState(() => _selectedImage = null);
                                },
                                backgroundColor: AppColors.danger,
                                child: const Icon(Icons.close),
                              ),
                            ),
                          ],
                        )
                      else
                        Container(
                          width: double.infinity,
                          height: 120,
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.border),
                            borderRadius: BorderRadius.circular(8),
                            color: AppColors.background,
                          ),
                          child: const Center(
                            child: Text('No photo selected'),
                          ),
                        ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _pickImage,
                              icon: const Icon(Icons.photo_library),
                              label: const Text('Gallery'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _takePhoto,
                              icon: const Icon(Icons.camera_alt),
                              label: const Text('Camera'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _loading ? null : _submitVisit,
                          child: _loading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Log Visit'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Visits History
            const Text(
              'Recent Visits',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (_loadingVisits)
              const Center(child: CircularProgressIndicator())
            else if (_visits.isEmpty)
              Center(
                child: Text(
                  'No visits logged yet',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _visits.length,
                itemBuilder: (context, index) {
                  final visit = _visits[index];
                  final visitTime = DateTime.parse(visit['visited_at'] ?? DateTime.now().toIso8601String());
                  final formattedTime = '${visitTime.day}/${visitTime.month}/${visitTime.year} ${visitTime.hour}:${visitTime.minute.toString().padLeft(2, '0')}';

                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.location_on, color: AppColors.primary),
                      title: Text(visit['company_name'] ?? 'Unknown Company'),
                      subtitle: Text(formattedTime),
                      trailing: visit['photo_url'] != null
                          ? const Icon(Icons.image, color: AppColors.success, size: 20)
                          : null,
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
