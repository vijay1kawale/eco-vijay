class AppConstants {
  // Backend API base URL — update to your deployed server address
  static const String apiBaseUrl = 'http://192.168.0.136:3000';

  // JWT storage key
  static const String jwtKey = 'eco_vijay_jwt';

  // Nearby radius in km
  static const double nearbyRadiusKm = 10.0;

  // EPR service types
  static const List<String> serviceTypes = [
    'Plastic EPR Registration',
    'E-Waste EPR Registration',
    'Battery EPR Registration',
    'Tyre EPR Registration',
    'CPCB Annual Filing',
    'Compliance Audit',
    'EPR Certificate Renewal',
  ];

  // Lead status values
  static const List<String> leadStatuses = [
    'New',
    'Prospect',
    'Contacted',
    'Interested',
    'Negotiation',
    'Closed',
    'Lost',
  ];
}
