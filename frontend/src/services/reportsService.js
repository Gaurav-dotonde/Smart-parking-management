import api from './api';

export const getReportsSummary = (params) => api.get('/admin/reports/summary', { params });
export const getReportsBookingStatus = (params) => api.get('/admin/reports/booking-status', { params });
export const getReportsRevenue = (params) => api.get('/admin/reports/revenue', { params });
export const getReportsTopSlots = (params) => api.get('/admin/reports/top-slots', { params });
export const getReportsBookings = (params) => api.get('/admin/reports/bookings', { params });
