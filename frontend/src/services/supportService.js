import api from './api';

export const createSupportTicket = (payload) => api.post('/support/tickets', payload);

export const getMySupportTickets = (params = {}) => api.get('/support/tickets/mine', { params });
export const getMySupportSummary = () => api.get('/support/tickets/summary');
export const getSupportTicket = (id) => api.get(`/support/tickets/${id}`);
export const replySupportTicket = (id, payload) => api.post(`/support/tickets/${id}/reply`, payload);
export const closeSupportTicket = (id) => api.post(`/support/tickets/${id}/close`);

export const getAdminSupportTickets = (params = {}) => api.get('/admin/support', { params });
export const getAdminSupportSummary = () => api.get('/admin/support/summary');
export const getAdminSupportTicket = (id) => api.get(`/admin/support/${id}`);
export const updateSupportTicket = (id, payload) => api.put(`/admin/support/${id}`, payload);
export const replyAdminSupportTicket = (id, payload) => api.post(`/admin/support/${id}/reply`, payload);
