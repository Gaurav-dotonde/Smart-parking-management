import api from './api';
import { emitParkingDataChanged } from './dataSync';

export const getAdminVehicles = () => api.get('/admin/vehicles');
export const createAdminVehicle = async (data) => { const response = await api.post('/admin/vehicles', data); emitParkingDataChanged({ type: 'vehicle-created' }); return response; };
export const updateAdminVehicle = async (id, data) => { const response = await api.put(`/admin/vehicles/${id}`, data); emitParkingDataChanged({ type: 'vehicle-updated' }); return response; };
export const setAdminVehicleStatus = async (id, active) => { const response = await api.patch(`/admin/vehicles/${id}/status`, null, { params: { active } }); emitParkingDataChanged({ type: 'vehicle-status' }); return response; };
export const archiveAdminVehicle = async (id) => { const response = await api.delete(`/admin/vehicles/${id}`); emitParkingDataChanged({ type: 'vehicle-archived' }); return response; };
