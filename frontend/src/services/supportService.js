import api from './api';
export const createSupportTicket = (payload) => api.post('/support/tickets', payload);
export const getMySupportTickets = () => api.get('/support/tickets/mine');
export const getAdminSupportTickets = () => api.get('/admin/support');
export const updateSupportTicket = (id, payload) => api.put(`/admin/support/${id}`, payload);
