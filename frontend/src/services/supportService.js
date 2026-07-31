import api from './api';

export const createSupportTicket = (payload) => api.post('/support/tickets', payload);

export const getMySupportTickets = (params = {}) => api.get('/support/tickets/mine', { params });
export const getMySupportSummary = () => api.get('/support/tickets/summary');
export const getSupportTicket = (id) => api.get(`/support/tickets/${id}`);
export const replySupportTicket = (id, payload) => api.post(`/support/tickets/${id}/reply`, payload);
export const closeSupportTicket = (id) => api.post(`/support/tickets/${id}/close`);
export const reopenSupportTicket = (id) => api.post(`/support/tickets/${id}/reopen`);
export const cancelSupportTicket = (id) => api.post(`/support/tickets/${id}/cancel`);

export const getAdminSupportTickets = (params = {}) => api.get('/admin/support', { params });
export const getAdminSupportSummary = () => api.get('/admin/support/summary');
export const getAdminSupportTicket = (id) => api.get(`/admin/support/${id}`);
export const updateSupportTicket = (id, payload) => api.put(`/admin/support/${id}`, payload);
export const replyAdminSupportTicket = (id, payload) => api.post(`/admin/support/${id}/reply`, payload);
export const addSupportInternalNote = (id, note) => api.post(`/admin/support/${id}/internal-notes`, { note });
export const resolveSupportTicket = (id, payload) => api.post(`/admin/support/${id}/resolve`, payload);
export const closeAdminSupportTicket = (id) => api.post(`/admin/support/${id}/close`);
export const reopenAdminSupportTicket = (id) => api.post(`/admin/support/${id}/reopen`);
