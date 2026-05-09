class QuotationModel {
  final String id;
  final String companyId;
  final String? companyName;
  final String userId;
  final String serviceType;
  final double price;
  final String? notes;
  final List<String> sentVia;
  final String? sentAt;
  final String? status;

  QuotationModel({
    required this.id,
    required this.companyId,
    this.companyName,
    required this.userId,
    required this.serviceType,
    required this.price,
    this.notes,
    required this.sentVia,
    this.sentAt,
    this.status,
  });

  factory QuotationModel.fromJson(Map<String, dynamic> json) {
    List<String> sentVia = [];
    if (json['sent_via'] != null) {
      if (json['sent_via'] is List) {
        sentVia = List<String>.from(json['sent_via']);
      }
    }

    String? companyName;
    if (json['companies'] != null && json['companies'] is Map) {
      companyName = json['companies']['name'];
    }

    return QuotationModel(
      id: json['id'].toString(),
      companyId: json['company_id'].toString(),
      companyName: companyName ?? json['company_name'],
      userId: json['user_id'].toString(),
      serviceType: json['service_type'] ?? '',
      price: double.tryParse(json['price'].toString()) ?? 0.0,
      notes: json['notes'],
      sentVia: sentVia,
      sentAt: json['sent_at'],
      status: json['status'],
    );
  }
}
