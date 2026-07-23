import api from './api'; import { emitParkingDataChanged } from './dataSync';
export const getAdminPayments=()=>api.get('/admin/payments');
export const createAdminPayment=async(data)=>{const r=await api.post('/admin/payments',data);emitParkingDataChanged({type:'payment-created'});return r;};
export const verifyAdminPayment=async(id)=>{const r=await api.put(`/admin/payments/${id}/verify`);emitParkingDataChanged({type:'payment-verified'});return r;};
export const refundAdminPayment=async(id,amount)=>{const r=await api.put(`/admin/payments/${id}/refund`,null,{params:{amount}});emitParkingDataChanged({type:'payment-refunded'});return r;};
export const getBookingPayment=(bookingId)=>api.get(`/payments/booking/${bookingId}`);
export const payForBooking=async(bookingId)=>{const r=await api.put(`/payments/booking/${bookingId}/pay`);emitParkingDataChanged({type:'payment-completed',bookingId});return r;};
