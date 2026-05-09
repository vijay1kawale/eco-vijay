class CompanyModel {
  final String id;
  final String name;
  final String? mobile;
  final String? pibo;
  final String? gst;
  final String? pan;
  final String? address;
  final String? city;
  final String? pincode;
  final String? state;
  final double? latitude;
  final double? longitude;
  final String? companyType;
  final String? industry;
  final String? companyStatus;
  final String? website;
  final String? logoUrl;
  final String? leadStatus;
  final double? dealValue;
  double? distanceKm;

  CompanyModel({
    required this.id,
    required this.name,
    this.mobile,
    this.pibo,
    this.gst,
    this.pan,
    this.address,
    this.city,
    this.pincode,
    this.state,
    this.latitude,
    this.longitude,
    this.companyType,
    this.industry,
    this.companyStatus,
    this.website,
    this.logoUrl,
    this.leadStatus,
    this.dealValue,
    this.distanceKm,
  });

  factory CompanyModel.fromJson(Map<String, dynamic> json) {
    // Extract lead status from nested leads array if present
    String? leadStatus;
    double? dealValue;
    final leads = json['leads'];
    if (leads != null && leads is List && leads.isNotEmpty) {
      leadStatus = leads.first['lead_status'];
      dealValue = leads.first['value'] != null
          ? double.tryParse(leads.first['value'].toString())
          : null;
    }

    // Build logo URL from Clearbit if website is available
    String? logoUrl = json['logo_url'];
    if ((logoUrl == null || logoUrl.isEmpty) && json['website'] != null) {
      final domain = _extractDomain(json['website']);
      if (domain != null) {
        logoUrl = 'https://logo.clearbit.com/$domain';
      }
    }

    return CompanyModel(
      id: json['id'].toString(),
      name: json['name'] ?? '',
      mobile: json['mobile'],
      pibo: json['pibo'],
      gst: json['gst'],
      pan: json['pan'],
      address: json['address'],
      city: json['city'],
      pincode: json['pincode'],
      state: json['state'],
      latitude: json['latitude'] != null
          ? double.tryParse(json['latitude'].toString())
          : null,
      longitude: json['longitude'] != null
          ? double.tryParse(json['longitude'].toString())
          : null,
      companyType: json['company_type'],
      industry: json['industry'],
      companyStatus: json['company_status'],
      website: json['website'],
      logoUrl: logoUrl,
      leadStatus: leadStatus ?? json['lead_status'],
      dealValue: dealValue,
      distanceKm: json['distance_km'] != null
          ? double.tryParse(json['distance_km'].toString())
          : null,
    );
  }

  static String? _extractDomain(String url) {
    try {
      final uri = Uri.parse(
          url.startsWith('http') ? url : 'https://$url');
      return uri.host.replaceFirst('www.', '');
    } catch (_) {
      return null;
    }
  }
}
