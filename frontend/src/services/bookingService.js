import api from './api';
import { emitParkingDataChanged } from './dataSync';

export const bookSlot = async (data) => {
  const response = await api.post('/bookings/book', data);
  emitParkingDataChanged({ type: 'booking-created', booking: response.data });
  return response;
};
export const cancelBooking = async (id) => {
  const response = await api.put(`/bookings/${id}/cancel`);
  emitParkingDataChanged({ type: 'booking-cancelled', bookingId: id });
  return response;
};
export const checkInBooking = async (id) => {
  const response = await api.put(`/bookings/${id}/check-in`);
  emitParkingDataChanged({ type: 'booking-status', bookingId: id, action: 'CHECK_IN' });
  return response;
};
export const checkOutBooking = async (id) => {
  const response = await api.put(`/bookings/${id}/check-out`);
  emitParkingDataChanged({ type: 'booking-status', bookingId: id, action: 'CHECK_OUT' });
  return response;
};
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const getUserBookings = (userId) => api.get(`/bookings/user/${userId}`);
export const getMyBookings = () => api.get('/bookings/my');
export const getAdminBookings = () => api.get('/admin/bookings');
export const getAdminBookingById = (id) => api.get(`/admin/bookings/${id}`);
export const cancelAdminBooking = async (id) => {
  const response = await api.put(`/admin/bookings/${id}/cancel`);
  emitParkingDataChanged({ type: 'booking-cancelled', bookingId: id });
  return response;
};
export const bookSlotsBatch = async (data) => {
  const response = await api.post('/bookings/book-batch', data);
  emitParkingDataChanged({ type: 'booking-batch-created', bookings: response.data });
  return response;
};
export const transitionAdminBooking = async (id, action) => {
  const response = await api.put(`/admin/bookings/${id}/${action}`);
  emitParkingDataChanged({ type: 'booking-status', bookingId: id, action });
  return response;
};
export const extendBooking = async (id, data) => {
  const response = await api.post(`/bookings/${id}/extend`, data);
  emitParkingDataChanged({ type: 'booking-extended', bookingId: id });
  return response;
};
export const extendAdminBooking = async (id, data) => {
  const response = await api.post(`/admin/bookings/${id}/extend`, data);
  emitParkingDataChanged({ type: 'booking-extended', bookingId: id });
  return response;
};
