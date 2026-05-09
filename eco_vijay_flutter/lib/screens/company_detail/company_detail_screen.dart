import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/company_model.dart';
import '../../widgets/lead_status_badge.dart';
import '../../widgets/section_card.dart';
import '../quotation/quotation_screen.dart';

class CompanyDetailScreen extends StatefulWidget {
  final String companyId;
  const CompanyDetailScreen({super.key, required this.companyId});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> {
  CompanyModel? _company;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCompany();
  }

  Future<void> _loadCompany() async {
    try {
      final data = await ApiService.get('/companies/${widget.companyId}');
      setState(() {
        _company = CompanyModel.fromJson(data);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _launchMaps() async {
    final c = _company!;
    if (c.latitude != null && c.longitude != null) {
      final uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}');
      if (await canLaunchUrl(uri)) await launchUrl(uri);
    } else {
      final query = Uri.encodeComponent(
          '${c.name}, ${c.address ?? ''}, ${c.city ?? ''}');
      final uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=$query');
      if (await canLaunchUrl(uri)) await launchUrl(uri);
    }
  }

  Future<void> _call() async {
    if (_company?.mobile == null) return;
    final uri = Uri.parse('tel:${_company!.mobile}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_company?.name ?? 'Company Detail'),
        actions: [
          if (_company != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: LeadStatusBadge(status: _company!.leadStatus),
            ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.primary)))
          : _error != null
              ? Center(
                  child: Text(_error!,
                      style: const TextStyle(color: AppColors.danger)))
              : _buildBody(),
    );
  }

  Widget _buildBody() {
    final c = _company!;
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        // Header card with logo
        Container(
          color: AppColors.primary,
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Row(
            children: [
              _LogoWidget(logoUrl: c.logoUrl, name: c.name),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (c.industry != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        c.industry!,
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.8), fontSize: 13),
                      ),
                    ],
                    if (c.companyType != null) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          c.companyType!,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 11),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              _ActionButton(
                icon: Icons.map_outlined,
                label: 'View on Map',
                onTap: _launchMaps,
              ),
              const SizedBox(width: 10),
              _ActionButton(
                icon: Icons.call_outlined,
                label: 'Call',
                onTap: _call,
                enabled: c.mobile != null,
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => QuotationScreen(company: c),
                      ),
                    );
                  },
                  icon: const Icon(Icons.description_outlined, size: 18),
                  label: const Text('Generate Quotation'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Contact Info
        SectionCard(
          title: 'Contact Information',
          children: [
            _InfoRow(icon: Icons.phone_outlined, label: 'Mobile', value: c.mobile),
            _InfoRow(icon: Icons.person_outline, label: 'PIBO', value: c.pibo),
          ],
        ),

        // Address
        SectionCard(
          title: 'Address',
          children: [
            _InfoRow(icon: Icons.location_on_outlined, label: 'Address', value: c.address),
            _InfoRow(icon: Icons.location_city_outlined, label: 'City', value: c.city),
            _InfoRow(icon: Icons.map_outlined, label: 'State', value: c.state),
            _InfoRow(icon: Icons.pin_drop_outlined, label: 'Pincode', value: c.pincode),
          ],
        ),

        // Legal
        SectionCard(
          title: 'Legal & Tax',
          children: [
            _InfoRow(icon: Icons.receipt_long_outlined, label: 'GST', value: c.gst),
            _InfoRow(icon: Icons.badge_outlined, label: 'PAN', value: c.pan),
          ],
        ),

        // Status
        SectionCard(
          title: 'Status',
          children: [
            _InfoRow(icon: Icons.business_center_outlined, label: 'Company Status', value: c.companyStatus),
            _InfoRow(icon: Icons.flag_outlined, label: 'Lead Status', value: c.leadStatus),
            if (c.dealValue != null)
              _InfoRow(
                icon: Icons.currency_rupee_outlined,
                label: 'Deal Value',
                value: '₹${c.dealValue!.toStringAsFixed(0)}',
              ),
          ],
        ),

        if (c.website != null)
          SectionCard(
            title: 'Web',
            children: [
              _InfoRow(icon: Icons.language_outlined, label: 'Website', value: c.website),
            ],
          ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool enabled;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: OutlinedButton.icon(
        onPressed: enabled ? onTap : null,
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 12)),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;

  const _InfoRow({required this.icon, required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value!,
              style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _LogoWidget extends StatelessWidget {
  final String? logoUrl;
  final String name;

  const _LogoWidget({this.logoUrl, required this.name});

  @override
  Widget build(BuildContext context) {
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            logoUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _fallback(),
          ),
        ),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
