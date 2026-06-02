import 'dart:io';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../models/company_model.dart';

class PdfService {
  static const PdfColor _forestGreen = PdfColor.fromInt(0xFF1B4332);
  static const PdfColor _gold = PdfColor.fromInt(0xFFC9A84C);
  static const PdfColor _white = PdfColor.fromInt(0xFFFFFFFF);
  static const PdfColor _lightGrey = PdfColor.fromInt(0xFFF5F5F0);
  static const PdfColor _textDark = PdfColor.fromInt(0xFF1A1A1A);
  static const PdfColor _textMuted = PdfColor.fromInt(0xFF6B6B6B);

  /// Generate a PDF quotation, save it, open it, and return the file path.
  static Future<String> generateQuotation({
    required CompanyModel company,
    required String serviceType,
    required double price,
    required String agentName,
    required String agentPhone,
    String? notes,
  }) async {
    final pdf = pw.Document();

    // Load app icon bytes for the header logo
    Uint8List? iconBytes;
    try {
      final byteData = await rootBundle.load('assets/icon/app_icon.png');
      iconBytes = byteData.buffer.asUint8List();
    } catch (_) {
      iconBytes = null;
    }

    final quotationNumber =
        'QT-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final dateStr = DateFormat('dd MMM yyyy').format(DateTime.now());

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(0),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // ── Header ──────────────────────────────────────────────────
              pw.Container(
                color: _forestGreen,
                padding: const pw.EdgeInsets.symmetric(
                    horizontal: 36, vertical: 28),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Row(
                      children: [
                        if (iconBytes != null) ...[
                          pw.Container(
                            width: 48,
                            height: 48,
                             decoration: const pw.BoxDecoration(
                              color: _white,
                              borderRadius:
                                  pw.BorderRadius.all(pw.Radius.circular(8)),
                            ),
                            child: pw.ClipRRect(
                              horizontalRadius: 8,
                              verticalRadius: 8,
                              child: pw.Image(
                                pw.MemoryImage(iconBytes),
                                fit: pw.BoxFit.cover,
                              ),
                            ),
                          ),
                          pw.SizedBox(width: 14),
                        ],
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              'ECO-VIJAY',
                              style: pw.TextStyle(
                                font: pw.Font.helveticaBold(),
                                fontSize: 22,
                                color: _white,
                                letterSpacing: 2,
                              ),
                            ),
                            pw.Text(
                              'EPR Compliance Solutions',
                              style: pw.TextStyle(
                                font: pw.Font.helvetica(),
                                fontSize: 11,
                                color: _gold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'QUOTATION',
                          style: pw.TextStyle(
                            font: pw.Font.helveticaBold(),
                            fontSize: 20,
                            color: _gold,
                            letterSpacing: 1.5,
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          quotationNumber,
                          style: pw.TextStyle(
                            font: pw.Font.helvetica(),
                            fontSize: 11,
                            color: _white,
                          ),
                        ),
                        pw.Text(
                          dateStr,
                          style: pw.TextStyle(
                            font: pw.Font.helvetica(),
                            fontSize: 11,
                            color: _white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Body ────────────────────────────────────────────────────
              pw.Expanded(
                child: pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(
                      horizontal: 36, vertical: 24),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                    children: [
                      // ── Company Section ──────────────────────────────
                      _sectionHeader('BILL TO'),
                      pw.SizedBox(height: 8),
                      pw.Container(
                        padding: const pw.EdgeInsets.all(14),
                         decoration: const pw.BoxDecoration(
                          color: _lightGrey,
                          borderRadius:
                               pw.BorderRadius.all(pw.Radius.circular(8)),
                        ),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              company.name,
                              style: pw.TextStyle(
                                font: pw.Font.helveticaBold(),
                                fontSize: 14,
                                color: _textDark,
                              ),
                            ),
                            if (company.address != null &&
                                company.address!.isNotEmpty) ...[
                              pw.SizedBox(height: 4),
                              pw.Text(
                                [
                                  company.address,
                                  company.city,
                                  company.state,
                                  company.pincode
                                ].where((s) => s != null && s.isNotEmpty).join(', '),
                                style: pw.TextStyle(
                                  font: pw.Font.helvetica(),
                                  fontSize: 11,
                                  color: _textMuted,
                                ),
                              ),
                            ],
                            if (company.gst != null &&
                                company.gst!.isNotEmpty) ...[
                              pw.SizedBox(height: 4),
                              pw.Text(
                                'GSTIN: ${company.gst}',
                                style: pw.TextStyle(
                                  font: pw.Font.helvetica(),
                                  fontSize: 11,
                                  color: _textMuted,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      pw.SizedBox(height: 20),

                      // ── Service & Pricing Table ──────────────────────
                      _sectionHeader('SERVICE & PRICING'),
                      pw.SizedBox(height: 8),
                      pw.Table(
                        border: pw.TableBorder.all(
                          color: const PdfColor.fromInt(0xFFE2E8F0),
                          width: 0.5,
                        ),
                        columnWidths: {
                          0: const pw.FlexColumnWidth(3),
                          1: const pw.FlexColumnWidth(1),
                        },
                        children: [
                          // Header row
                          pw.TableRow(
                            decoration: const pw.BoxDecoration(
                              color: _forestGreen,
                            ),
                            children: [
                              _tableCell('Service Description',
                                  isHeader: true),
                              _tableCell('Amount',
                                  isHeader: true, align: pw.TextAlign.right),
                            ],
                          ),
                          // Data row
                          pw.TableRow(
                            decoration: const pw.BoxDecoration(
                              color: _white,
                            ),
                            children: [
                              _tableCell(serviceType),
                              _tableCell(
                                '₹ ${NumberFormat('#,##,###').format(price)}',
                                align: pw.TextAlign.right,
                              ),
                            ],
                          ),
                          // Total row
                          pw.TableRow(
                            decoration: const pw.BoxDecoration(
                              color: _lightGrey,
                            ),
                            children: [
                              _tableCell('Total',
                                  bold: true,
                                  align: pw.TextAlign.right),
                              _tableCell(
                                '₹ ${NumberFormat('#,##,###').format(price)}',
                                bold: true,
                                align: pw.TextAlign.right,
                                color: _forestGreen,
                              ),
                            ],
                          ),
                        ],
                      ),

                      pw.SizedBox(height: 20),

                      // ── Agent Info ───────────────────────────────────
                      _sectionHeader('YOUR POINT OF CONTACT'),
                      pw.SizedBox(height: 8),
                      pw.Container(
                        padding: const pw.EdgeInsets.all(14),
                        decoration: const pw.BoxDecoration(
                          color: _lightGrey,
                          borderRadius:
                              pw.BorderRadius.all(pw.Radius.circular(8)),
                        ),
                        child: pw.Row(
                          children: [
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  agentName,
                                  style: pw.TextStyle(
                                    font: pw.Font.helveticaBold(),
                                    fontSize: 12,
                                    color: _textDark,
                                  ),
                                ),
                                pw.SizedBox(height: 3),
                                pw.Text(
                                  'Field Sales Executive — Eco-Vijay',
                                  style: pw.TextStyle(
                                    font: pw.Font.helvetica(),
                                    fontSize: 10,
                                    color: _textMuted,
                                  ),
                                ),
                                if (agentPhone.isNotEmpty) ...[
                                  pw.SizedBox(height: 3),
                                  pw.Text(
                                    'Ph: $agentPhone',
                                    style: pw.TextStyle(
                                      font: pw.Font.helvetica(),
                                      fontSize: 10,
                                      color: _textMuted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),

                      // ── Notes ────────────────────────────────────────
                      if (notes != null && notes.isNotEmpty) ...[
                        pw.SizedBox(height: 20),
                        _sectionHeader('NOTES'),
                        pw.SizedBox(height: 8),
                        pw.Container(
                          padding: const pw.EdgeInsets.all(14),
                          decoration: pw.BoxDecoration(
                            border: pw.Border.all(
                              color: const PdfColor.fromInt(0xFFE2E8F0),
                              width: 0.5,
                            ),
                            borderRadius:
                                const pw.BorderRadius.all(pw.Radius.circular(8)),
                          ),
                          child: pw.Text(
                            notes,
                            style: pw.TextStyle(
                              font: pw.Font.helvetica(),
                              fontSize: 11,
                              color: _textMuted,
                            ),
                          ),
                        ),
                      ],

                      pw.Spacer(),

                      // ── Footer ───────────────────────────────────────
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(vertical: 12),
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            top: pw.BorderSide(
                              color: PdfColor.fromInt(0xFFE2E8F0),
                              width: 0.5,
                            ),
                          ),
                        ),
                        child: pw.Center(
                          child: pw.Text(
                            'Powered by Eco-Vijay | IIM Bangalore Alumni Initiative',
                            style: pw.TextStyle(
                              font: pw.Font.helveticaOblique(),
                              fontSize: 9,
                              color: _gold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    // Save file
    final dir = await getApplicationDocumentsDirectory();
    final fileName =
        'quotation_${company.name.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}_${DateTime.now().millisecondsSinceEpoch}.pdf';
    final file = File('${dir.path}/$fileName');
    await file.writeAsBytes(await pdf.save());

    // Open the file
    await OpenFile.open(file.path);

    return file.path;
  }

  static pw.Widget _sectionHeader(String title) {
    return pw.Text(
      title,
      style: pw.TextStyle(
        font: pw.Font.helveticaBold(),
        fontSize: 10,
        color: _forestGreen,
        letterSpacing: 1.2,
      ),
    );
  }

  static pw.Widget _tableCell(
    String text, {
    bool isHeader = false,
    bool bold = false,
    pw.TextAlign align = pw.TextAlign.left,
    PdfColor? color,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          font: (isHeader || bold)
              ? pw.Font.helveticaBold()
              : pw.Font.helvetica(),
          fontSize: isHeader ? 11 : 12,
          color: color ?? (isHeader ? _white : _textDark),
        ),
      ),
    );
  }
}
