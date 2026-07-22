import api from './api';
import { emitParkingDataChanged } from './dataSync';

export const getCurrentUser = () => api.get('/users/me');
export const updateCurrentUser = (data) => api.put('/users/me', data);
export const changeCurrentUserPassword = (data) => api.put('/users/me/password', data);
export const getUserDashboard = () => api.get('/users/me/dashboard');

export const getAdminUsers = () => api.get('/admin/users');
export const getAdminUserById = (id) => api.get(`/admin/users/${id}`);
export const createAdminUser = async (data) => {
  const response = await api.post('/admin/users', data);
  emitParkingDataChanged({ type: 'user-created', userId: response.data.id });
  return response;
};
export const updateAdminUser = async (id, data) => {
  const response = await api.put(`/admin/users/${id}`, data);
  emitParkingDataChanged({ type: 'user-updated', userId: id });
  return response;
};
export const blockAdminUser = async (id) => {
  const response = await api.put(`/admin/users/${id}/block`);
  emitParkingDataChanged({ type: 'user-blocked', userId: id });
  return response;
};
export const unblockAdminUser = async (id) => {
  const response = await api.put(`/admin/users/${id}/unblock`);
  emitParkingDataChanged({ type: 'user-unblocked', userId: id });
  return response;
};
export const deleteAdminUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  emitParkingDataChanged({ type: 'user-archived', userId: id });
  return response;
};
export const getAdminProfile = () => api.get('/admin/profile');
export const updateAdminProfile = (data) => api.put('/admin/profile', data);
export const changeAdminPassword = (data) => api.put('/admin/profile/change-password', data);
export const uploadAdminProfilePhoto = (formData) => api.post('/admin/profile/photo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteAdminProfilePhoto = () => api.delete('/admin/profile/photo');
