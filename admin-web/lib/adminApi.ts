import api from './api';

// ── Dashboard ──────────────────────────────────────────────
export const getDashboardStats = () =>
  api.get('/admin/dashboard/stats');

export const getAdminDashboard = {
  getUsersLocations: () =>
    api.get('/admin/dashboard/users-locations'),
};

// ── Users ──────────────────────────────────────────────────
export const getUsers = (params?: { search?: string; role?: string; status?: string }) =>
  api.get('/admin/users', { params });

export const createUser = (body: { name: string; email: string; phone?: string; role: string; password: string; office_id?: string; assigned_office_lat?: number; assigned_office_lng?: number }) =>
  api.post('/admin/users', body);

export const updateUser = (id: string, body: Partial<{ name: string; email: string; phone: string; role: string; is_active: boolean; office_id?: string; assigned_office_lat?: number; assigned_office_lng?: number }>) =>
  api.patch(`/admin/users/${id}`, body);

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`);

// ── Attendance ─────────────────────────────────────────────
export const getAttendance = (params?: { from?: string; to?: string; user_id?: string }) =>
  api.get('/admin/attendance', { params });

// ── Quotations ─────────────────────────────────────────────
export const getQuotations = (params?: { search?: string; service_type?: string; from?: string; to?: string }) =>
  api.get('/admin/quotations', { params });

// ── Companies (admin route — cookie auth) ─────────────────
export const getCompanies = (params?: { search?: string }) =>
  api.get('/admin/companies', { params });

export const updateCompany = (id: string, body: { lead_status?: string; notes?: string }) =>
  api.patch(`/admin/companies/${id}`, body);

// ── Activity Logs ──────────────────────────────────────────
export const getActivityLogs = () =>
  api.get('/admin/activity-logs');

export const logActivity = (body: { action: string; resource_type?: string; resource_id?: string; details?: object }) =>
  api.post('/admin/activity-logs', body);

// ── Visits ──────────────────────────────────────────────────
export const getVisits = (params?: { user_id?: string; date_from?: string; date_to?: string }) =>
  api.get('/admin/visits', { params });
