import api from './api';
import { emitParkingDataChanged } from './dataSync';

const emitChange = (type, payload = {}) => emitParkingDataChanged({ type, ...payload });

export const getAllLots = () => api.get('/lots');
export const getActiveLots = () => api.get('/lots/active');
export const getLotById = (id) => api.get(`/lots/${id}`);
export const getSlots = (lotId) => api.get(`/lots/${lotId}/slots`);
export const getAdminSlots = (lotId) => api.get(`/lots/${lotId}/slots/admin`);
export const createLot = async (data) => {
  const response = await api.post('/lots', data);
  emitChange('lot-created', { lot: response.data });
  return response;
};
export const updateLot = async (id, data) => {
  const response = await api.put(`/lots/${id}`, data);
  emitChange('lot-updated', { lot: response.data, lotId: id });
  return response;
};
export const createSlot = async (lotId, data) => {
  const response = await api.post(`/lots/${lotId}/slots`, data);
  emitChange('slot-created', { slot: response.data, lotId });
  return response;
};
export const updateSlot = async (lotId, slotId, data) => {
  const response = await api.put(`/lots/${lotId}/slots/${slotId}`, data);
  emitChange('slot-updated', { slot: response.data, lotId, slotId });
  return response;
};
export const deleteSlot = async (lotId, slotId) => {
  const response = await api.delete(`/lots/${lotId}/slots/${slotId}`);
  emitChange('slot-deleted', { lotId, slotId });
  return response;
};
export const findParking = (params) => api.get('/user/find-parking', { params });

export const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};
