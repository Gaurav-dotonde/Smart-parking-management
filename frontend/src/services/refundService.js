import api from './api';
import { emitParkingDataChanged } from './dataSync';

export const getUserRefundSummary = () => api.get('/user/refunds/summary');
export const getUserRefunds = (params = {}) => api.get('/user/refunds', { params });
export const getUserRefundById = (refundId) => api.get(`/user/refunds/${refundId}`);

export const getAdminRefundSummary = () => api.get('/admin/refunds/summary');
export const getAdminRefunds = (params = {}) => api.get('/admin/refunds', { params });
export const getAdminRefundById = (refundId) => api.get(`/admin/refunds/${refundId}`);
export const retryAdminRefund = async (refundId, reason) => {
  const response = await api.post(`/admin/refunds/${refundId}/retry`, { reason });
  emitParkingDataChanged({ type: 'refund-retried', refundId });
  return response;
};
