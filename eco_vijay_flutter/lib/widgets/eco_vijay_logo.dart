import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class EcoVijayLogo extends StatelessWidget {
  final double size;
  const EcoVijayLogo({super.key, this.size = 100});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(size * 0.24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.35),
            blurRadius: size * 0.26,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      child: Icon(Icons.eco, color: Colors.white, size: size * 0.54),
    );
  }
}
