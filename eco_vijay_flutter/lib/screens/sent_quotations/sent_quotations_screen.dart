import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/quotation_model.dart';

class SentQuotationsScreen extends StatefulWidget {
  const SentQuotationsScreen({super.key});

  @override
  State<SentQuotationsScreen> createState() => _SentQuotationsScreenState();
}

class _SentQuotationsScreenState extends State<SentQuotationsScreen> {
  List<QuotationModel> _quotations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/quotations/sent');
      setState(() {
        _quotations =
            (data as List).map((e) => QuotationModel.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sent Quotations'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
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
              : _quotations.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.description_outlined,
                              size: 60, color: AppColors.border),
                          SizedBox(height: 16),
                          Text(
                            'No quotations sent yet',
                            style: TextStyle(
                                color: AppColors.textSecondary, fontSize: 15),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: _quotations.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, color: AppColors.border),
                      itemBuilder: (_, i) => _QuotationTile(q: _quotations[i]),
                    ),
    );
  }
}

class _QuotationTile extends StatelessWidget {
  final QuotationModel q;
  const _QuotationTile({required this.q});

  @override
  Widget build(BuildContext context) {
    String? dateStr;
    if (q.sentAt != null) {
      try {
        final dt = DateTime.parse(q.sentAt!).toLocal();
        dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(dt);
      } catch (_) {}
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  q.companyName ?? 'Unknown Company',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: AppColors.textPrimary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '₹${q.price.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            q.serviceType,
            style: const TextStyle(
                fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              if (dateStr != null)
                Row(
                  children: [
                    const Icon(Icons.access_time,
                        size: 12, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(dateStr,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary)),
                    const SizedBox(width: 12),
                  ],
                ),
              ...q.sentVia.map((ch) => _ChannelBadge(channel: ch)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChannelBadge extends StatelessWidget {
  final String channel;
  const _ChannelBadge({required this.channel});

  Color get _color {
    switch (channel.toLowerCase()) {
      case 'email':
        return AppColors.accent;
      case 'whatsapp':
        return AppColors.success;
      case 'sms':
        return AppColors.warning;
      default:
        return AppColors.secondary;
    }
  }

  IconData get _icon {
    switch (channel.toLowerCase()) {
      case 'email':
        return Icons.email_outlined;
      case 'whatsapp':
        return Icons.chat_outlined;
      case 'sms':
        return Icons.sms_outlined;
      default:
        return Icons.send_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: 10, color: _color),
          const SizedBox(width: 4),
          Text(
            channel.toUpperCase(),
            style: TextStyle(
                fontSize: 10, color: _color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
