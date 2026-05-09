import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LeadStatusBadge extends StatelessWidget {
  final String? status;

  const LeadStatusBadge({super.key, this.status});

  Color get _color {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'prospect':
        return AppColors.pinNew;
      case 'contacted':
        return AppColors.pinContacted;
      case 'interested':
      case 'negotiation':
        return AppColors.pinInterested;
      case 'closed':
        return AppColors.pinClosed;
      case 'lost':
        return AppColors.pinLost;
      default:
        return AppColors.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (status == null || status!.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withOpacity(0.4)),
      ),
      child: Text(
        status!,
        style: TextStyle(
          color: _color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
