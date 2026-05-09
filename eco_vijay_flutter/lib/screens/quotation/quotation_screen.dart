import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/company_model.dart';
import '../../utils/constants.dart';

class QuotationScreen extends StatefulWidget {
  final CompanyModel company;
  const QuotationScreen({super.key, required this.company});

  @override
  State<QuotationScreen> createState() => _QuotationScreenState();
}

class _QuotationScreenState extends State<QuotationScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedService;
  final _priceController = TextEditingController();
  final _notesController = TextEditingController();
  bool _sendEmail = false;
  bool _sendWhatsApp = true;
  bool _sendSms = false;
  bool _loading = false;

  @override
  void dispose() {
    _priceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_sendEmail && !_sendWhatsApp && !_sendSms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Select at least one channel to send via')),
      );
      return;
    }

    setState(() => _loading = true);
    final sentVia = [
      if (_sendEmail) 'email',
      if (_sendWhatsApp) 'whatsapp',
      if (_sendSms) 'sms',
    ];

    try {
      await ApiService.post('/quotations', {
        'company_id': widget.company.id,
        'service_type': _selectedService,
        'price': double.parse(_priceController.text.trim()),
        'notes': _notesController.text.trim(),
        'sent_via': sentVia,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Quotation sent successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Generate Quotation'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Company chip
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.business, color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.company.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Service type dropdown
              DropdownButtonFormField<String>(
                value: _selectedService,
                decoration: const InputDecoration(
                  labelText: 'Service Type',
                  prefixIcon: Icon(Icons.category_outlined,
                      color: AppColors.textSecondary),
                ),
                items: AppConstants.serviceTypes
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedService = v),
                validator: (v) => v == null ? 'Select a service type' : null,
              ),
              const SizedBox(height: 16),

              // Price
              TextFormField(
                controller: _priceController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Price (₹)',
                  prefixIcon: Icon(Icons.currency_rupee_outlined,
                      color: AppColors.textSecondary),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Price is required';
                  if (double.tryParse(v.trim()) == null) return 'Enter a valid amount';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Notes
              TextFormField(
                controller: _notesController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  alignLabelWithHint: true,
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(bottom: 60),
                    child: Icon(Icons.notes_outlined,
                        color: AppColors.textSecondary),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Send channels
              const Text(
                'Send via',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 10),
              _ChannelToggle(
                icon: Icons.email_outlined,
                label: 'Email',
                value: _sendEmail,
                onChanged: (v) => setState(() => _sendEmail = v),
                color: AppColors.accent,
              ),
              _ChannelToggle(
                icon: Icons.chat_outlined,
                label: 'WhatsApp',
                value: _sendWhatsApp,
                onChanged: (v) => setState(() => _sendWhatsApp = v),
                color: AppColors.success,
              ),
              _ChannelToggle(
                icon: Icons.sms_outlined,
                label: 'SMS',
                value: _sendSms,
                onChanged: (v) => setState(() => _sendSms = v),
                color: AppColors.warning,
              ),
              const SizedBox(height: 28),

              ElevatedButton.icon(
                onPressed: _loading ? null : _send,
                icon: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send_outlined, size: 18),
                label: const Text('Send Quotation'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelToggle extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color color;

  const _ChannelToggle({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: value ? color.withOpacity(0.06) : AppColors.cardBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: value ? color.withOpacity(0.4) : AppColors.border),
      ),
      child: SwitchListTile(
        value: value,
        onChanged: onChanged,
        secondary: Icon(icon, color: value ? color : AppColors.textSecondary),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: value ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
        activeColor: color,
        dense: true,
      ),
    );
  }
}
