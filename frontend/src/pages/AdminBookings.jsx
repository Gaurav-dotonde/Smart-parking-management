import React, { useEffect, useMemo, useState } from 'react';
import { cancelAdminBooking, getAdminBookingById, getAdminBookings } from '../services/bookingService';
import { onParkingDataChanged } from '../services/dataSync';
import { unwrapList } from '../services/parkingService';

const summaryCards = [
  { title: 'Total Bookings', key: 'total', tone: 'blue' },
  { title: 'Today Bookings', key: 'today', tone: 'amber' },
  { title: 'Active Bookings', key: 'active', tone: 'green' },
  { title: 'Completed Bookings', key: 'completed', tone: 'purple' },
  { title: 'Cancelled Bookings', key: 'cancelled', tone: 'red' },
];

const isSameDay = (value) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminBookings();
      setBookings(unwrapList(res.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    return onParkingDataChanged(() => {
      loadBookings();
    });
  }, []);

  const filteredBookings = useMemo(() => (
    bookings.filter((booking) => {
      const term = search.toLowerCase();
      const matchesSearch = !term
        || booking.userName?.toLowerCase().includes(term)
        || booking.vehicleNumber?.toLowerCase().includes(term)
        || booking.slotNumber?.toLowerCase().includes(term);

      const matchesBookingStatus = bookingStatus === 'All' || booking.bookingStatus === bookingStatus;
      const matchesPaymentStatus = paymentStatus === 'All' || booking.paymentStatus === paymentStatus;
      const matchesDate = !dateFilter || new Date(booking.startTime).toISOString().slice(0, 10) === dateFilter;

      return matchesSearch && matchesBookingStatus && matchesPaymentStatus && matchesDate;
    })
  ), [bookings, search, bookingStatus, paymentStatus, dateFilter]);

  const summary = useMemo(() => ({
    total: bookings.length,
    today: bookings.filter((booking) => isSameDay(booking.startTime)).length,
    active: bookings.filter((booking) => booking.bookingStatus === 'ACTIVE').length,
    completed: bookings.filter((booking) => booking.bookingStatus === 'COMPLETED').length,
    cancelled: bookings.filter((booking) => booking.bookingStatus === 'CANCELLED').length,
  }), [bookings]);

  const openDetails = async (bookingId) => {
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const res = await getAdminBookingById(bookingId);
      setSelectedBooking(res.data);
    } catch (err) {
      setDetailsError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await cancelAdminBooking(cancelTarget.id);
      setCancelTarget(null);
      if (selectedBooking?.id === cancelTarget.id) {
        setSelectedBooking(null);
      }
      await loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container admin-page">
      <h2 className="page-title">All Bookings</h2>
      <p className="subtitle">Track, filter, and manage all bookings in one place.</p>

      <div className="dashboard-stats-grid bookings-stats-grid">
        {summaryCards.map((card) => (
          <div key={card.key} className="card dashboard-stat-card">
            <div className={`dashboard-stat-icon ${card.tone}`}></div>
            <div>
              <span className="dashboard-stat-title">{card.title}</span>
              <strong className="dashboard-stat-value">{summary[card.key]}</strong>
            </div>
          </div>
        ))}
      </div>

      <section className="card bookings-card">
        <div className="dashboard-section-head">
          <h3>Filters</h3>
          <p>Search and narrow booking records by status, payment, and date.</p>
        </div>

        <div className="bookings-filters">
          <div className="form-group">
            <label>Search by User Name, Vehicle Number, or Slot Number</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookings"
            />
          </div>
          <div className="form-group">
            <label>Booking Status</label>
            <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
              <option>All</option>
              <option>PENDING</option>
              <option>ACTIVE</option>
              <option>COMPLETED</option>
              <option>CANCELLED</option>
            </select>
          </div>
          <div className="form-group">
            <label>Payment Status</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option>All</option>
              <option>PAID</option>
              <option>UNPAID</option>
              <option>REFUNDED</option>
              <option>REFUND_PENDING</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date Filter</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card bookings-card">
        <div className="dashboard-section-head">
          <h3>Bookings Table</h3>
          <p>Manage booking records and admin actions.</p>
        </div>

        {loading && <div className="empty-state">Loading bookings...</div>}
        {!loading && error && <div className="error-text">{error}</div>}
        {!loading && !error && !filteredBookings.length && (
          <div className="empty-state">No bookings found.</div>
        )}

        {!loading && !error && !!filteredBookings.length && (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Parking Lot</th>
                  <th>Slot Number</th>
                  <th>Floor</th>
                  <th>Vehicle Number</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Booking Status</th>
                  <th>Payment Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const canCancel = booking.bookingStatus === 'PENDING' || booking.bookingStatus === 'ACTIVE';
                  return (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td>{booking.userName}</td>
                      <td>{booking.email}</td>
                      <td>{booking.parkingLot}</td>
                      <td>{booking.slotNumber}</td>
                      <td>{booking.floor ?? 'N/A'}</td>
                      <td>{booking.vehicleNumber}</td>
                      <td>{formatDateTime(booking.startTime)}</td>
                      <td>{formatDateTime(booking.endTime)}</td>
                      <td>
                        <span className={`badge ${booking.bookingStatus === 'ACTIVE' ? 'badge-active' : booking.bookingStatus === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'}`}>
                          {booking.bookingStatus}
                        </span>
                      </td>
                      <td>{booking.paymentStatus}</td>
                      <td>Rs {booking.amount}</td>
                      <td>
                        <div className="manage-slots-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => openDetails(booking.id)}>
                            View Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={!canCancel}
                            onClick={() => setCancelTarget(booking)}
                          >
                            Cancel Booking
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(detailsLoading || detailsError || selectedBooking) && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="dashboard-section-head">
              <h3>Booking Details</h3>
              <button type="button" className="modal-close" onClick={() => { setSelectedBooking(null); setDetailsError(''); }}>
                x
              </button>
            </div>
            {detailsLoading && <div className="empty-state">Loading details...</div>}
            {!detailsLoading && detailsError && <div className="error-text">{detailsError}</div>}
            {!detailsLoading && selectedBooking && (
              <div className="booking-details-grid">
                <div><strong>Booking ID:</strong> {selectedBooking.id}</div>
                <div><strong>User Name:</strong> {selectedBooking.userName}</div>
                <div><strong>Email:</strong> {selectedBooking.email}</div>
                <div><strong>Parking Lot:</strong> {selectedBooking.parkingLot}</div>
                <div><strong>Slot Number:</strong> {selectedBooking.slotNumber}</div>
                <div><strong>Floor:</strong> {selectedBooking.floor ?? 'N/A'}</div>
                <div><strong>Vehicle Number:</strong> {selectedBooking.vehicleNumber}</div>
                <div><strong>Start Time:</strong> {formatDateTime(selectedBooking.startTime)}</div>
                <div><strong>End Time:</strong> {formatDateTime(selectedBooking.endTime)}</div>
                <div><strong>Booking Status:</strong> {selectedBooking.bookingStatus}</div>
                <div><strong>Payment Status:</strong> {selectedBooking.paymentStatus}</div>
                <div><strong>Amount:</strong> Rs {selectedBooking.amount}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-card">
            <h3>Cancel Booking</h3>
            <p>Are you sure you want to cancel booking #{cancelTarget.id}?</p>
            <div className="manage-slots-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCancelTarget(null)} disabled={actionLoading}>
                Keep Booking
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmCancel} disabled={actionLoading}>
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
