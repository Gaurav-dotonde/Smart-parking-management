import api from './api'; import { emitParkingDataChanged } from './dataSync';
export const getAdminPayments=()=>api.get('/admin/payments');
export const createAdminPayment=async(data)=>{const r=await api.post('/admin/payments',data);emitParkingDataChanged({type:'payment-created'});return r;};
export const verifyAdminPayment=async(id)=>{const r=await api.put(`/admin/payments/${id}/verify`);emitParkingDataChanged({type:'payment-verified'});return r;};
export const refundAdminPayment=async(id,amount)=>{const r=await api.put(`/admin/payments/${id}/refund`,null,{params:{amount}});emitParkingDataChanged({type:'payment-refunded'});return r;};
