import api from './api';
import { emitParkingDataChanged } from './dataSync';

export const getAdminVehicles = () => api.get('/admin/vehicles');
export const getArchivedAdminVehicles = () => api.get('/admin/vehicles/archived');
export const getMyVehicles = () => api.get('/users/me/vehicles');
export const createAdminVehicle = async (data) => { const response = await api.post('/admin/vehicles', data); emitParkingDataChanged({ type: 'vehicle-created' }); return response; };
export const updateAdminVehicle = async (id, data) => { const response = await api.put(`/admin/vehicles/${id}`, data); emitParkingDataChanged({ type: 'vehicle-updated' }); return response; };
export const setAdminVehicleStatus = async (id, active) => { const response = await api.patch(`/admin/vehicles/${id}/${active ? 'activate' : 'deactivate'}`); emitParkingDataChanged({ type: 'vehicle-status', vehicleId: id }); return response; };
export const archiveAdminVehicle = async (id) => { const response = await api.patch(`/admin/vehicles/${id}/archive`); emitParkingDataChanged({ type: 'vehicle-archived', vehicleId: id }); return response; };
export const restoreAdminVehicle = async (id) => { const response = await api.patch(`/admin/vehicles/${id}/restore`); emitParkingDataChanged({ type: 'vehicle-restored', vehicleId: id }); return response; };
