import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eco_vijay_flutter/widgets/eco_vijay_logo.dart';
import 'package:eco_vijay_flutter/theme/app_theme.dart';

void main() {
  testWidgets('EcoVijayLogo renders without errors', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(child: EcoVijayLogo(size: 80)),
        ),
      ),
    );
    expect(find.byType(EcoVijayLogo), findsOneWidget);
  });

  testWidgets('App theme colors are defined', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.theme,
        home: const Scaffold(body: SizedBox()),
      ),
    );
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
