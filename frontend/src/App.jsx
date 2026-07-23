import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import ParkingLots from './pages/ParkingLots';
import SlotBooking from './pages/SlotBooking';
import MyBookings from './pages/MyBookings';
import AdminLayout from './components/AdminLayout';
import AdminPanel from './pages/AdminPanel';
import AdminDashboard from './pages/AdminDashboard';
import AdminLots from './pages/AdminLots';
import AdminBookings from './pages/AdminBookings';
import AdminUsers from './pages/AdminUsers';
import AdminVehicles from './pages/AdminVehicles';
import AdminPayments from './pages/AdminPayments';
import AdminReports from './pages/AdminReports';
import AdminProfile from './pages/AdminProfile';
import AdminSupport from './pages/AdminSupport';
import UserHome from './pages/UserHome';
import UserLayout from './components/UserLayout';
import UserDashboard from './pages/UserDashboard';
import FindParking from './pages/FindParking';
import AvailableSlots from './pages/AvailableSlots';
import BookingHistory from './pages/BookingHistory';
import Payments from './pages/Payments';
import UserProfile from './pages/UserProfile';
import BookingDetails from './pages/BookingDetails';
import PaymentPlaceholderPage from './payment/PaymentPlaceholderPage';

function Home() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lots" element={
            <ProtectedRoute><ParkingLots /></ProtectedRoute>
          } />
          <Route path="/lots/:id" element={
            <ProtectedRoute><SlotBooking /></ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute><MyBookings /></ProtectedRoute>
          } />
          <Route path="/bookings/:id" element={
            <ProtectedRoute><BookingDetails /></ProtectedRoute>
          } />
          <Route path="/user/home" element={
            <ProtectedRoute userOnly><UserHome /></ProtectedRoute>
          } />
          <Route path="/user" element={
            <ProtectedRoute userOnly><UserLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/user/dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="find-parking" element={<FindParking />} />
            <Route path="available-slots" element={<AvailableSlots />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="booking-history" element={<BookingHistory />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payment-placeholder" element={<PaymentPlaceholderPage />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="lots" element={<AdminLots />} />
            <Route path="slots" element={<AdminPanel />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vehicles" element={<AdminVehicles />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="support" element={<AdminSupport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
