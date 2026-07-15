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
