import api from './api';
import { emitParkingDataChanged } from './dataSync';

const emitChange = (type, payload = {}) => emitParkingDataChanged({ type, ...payload });

export const getAllLots = () => api.get('/lots');
export const getActiveLots = () => api.get('/lots/active');
export const getLotById = (id) => api.get(`/lots/${id}`);
export const getSlots = (lotId) => api.get(`/lots/${lotId}/slots`);
export const getAdminSlots = (lotId) => api.get(`/lots/${lotId}/slots/admin`);
export const getAllAdminSlots = () => api.get('/admin/parking-slots');
export const getAdminSlot = (slotId) => api.get(`/admin/parking-slots/${slotId}`);
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
export const archiveLot = async (id) => {
  const response = await api.put(`/lots/${id}/archive`);
  emitChange('lot-archived', { lot: response.data, lotId: id });
  return response;
};
export const setLotStatus = async (id, active) => {
  const response = await api.put(`/lots/${id}/status`, null, { params: { active } });
  emitChange('lot-status-updated', { lot: response.data, lotId: id });
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
export const setSlotStatus = async (slotId, status) => {
  const response = await api.put(`/admin/parking-slots/${slotId}/status`, null, { params: { status } });
  emitChange('slot-status-updated', { slot: response.data, slotId });
  return response;
};
export const archiveSlot = async (slotId) => {
  const response = await api.put(`/admin/parking-slots/${slotId}/archive`);
  emitChange('slot-archived', { slotId });
  return response;
};
export const bulkCreateSlots = async (lotId, data) => {
  const response = await api.post(`/admin/parking-lots/${lotId}/slots/bulk`, data);
  emitChange('slots-bulk-created', { lotId, summary: response.data });
  return response;
};
export const getSlotSummary = (locationId) => api.get('/admin/slots/summary', { params: locationId ? { locationId } : {} });
export const getAdminSlotsPaged = (locationId, params) => api.get('/admin/slots', { params: { ...params, ...(locationId ? { locationId } : {}) } });
export const findParking = (params) => api.get('/user/find-parking', { params });

export const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

export const unwrapPage = (value) => {
  if (value?.data && typeof value.data === 'object' && Array.isArray(value.data.content)) return value.data;
  if (typeof value === 'object' && Array.isArray(value.content)) return value;
  return null;
};
