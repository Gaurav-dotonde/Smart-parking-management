import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDisplayName } from '../utils/formatDisplayName';
import { cancelAdminBooking, getAdminBookingById, getAdminBookings, transitionAdminBooking } from '../services/bookingService';
import { onParkingDataChanged } from '../services/dataSync';
import { unwrapList } from '../services/parkingService';

const summaryCards = [
  { title: 'Total Bookings', key: 'total', tone: 'blue' },
  { title: 'Today Bookings', key: 'today', tone: 'amber' },
  { title: 'Active Bookings', key: 'active', tone: 'green' },
  { title: 'Completed Bookings', key: 'completed', tone: 'purple' },
  { title: 'Cancelled Bookings', key: 'cancelled', tone: 'red' },
];

function BookingStatIcon({ type }) {
  const icons = {
    total: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4m8-4v4M4 10h16M8 14h3m-3 3h6" /></>,
    today: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2M7 3.5l-2 2m12-2 2 2" /></>,
    active: <><path d="M4 15v-4l2-4h12l2 4v4M3 15h18v3H3z" /><circle cx="7" cy="12" r="1" /><circle cx="17" cy="12" r="1" /><path d="m9 4 2 2 4-4" /></>,
    completed: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4m8-4v4M4 10h16m4 3-6 6-3-3" /></>,
    cancelled: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4m8-4v4M4 10h16m-5 3 4 4m0-4-4 4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[type]}</svg>;
}

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
  const [searchParams] = useSearchParams();
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
  const [transitionTarget, setTransitionTarget] = useState(null);

  useEffect(() => {
    const requestedStatus = searchParams.get('status');
    const requestedDate = searchParams.get('date');
    if (requestedStatus) setBookingStatus(requestedStatus);
    if (requestedDate === 'today') setDateFilter(new Date().toISOString().slice(0, 10));
  }, [searchParams]);

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

  const confirmTransition = async () => {
    if (!transitionTarget) return;
    setActionLoading(true);
    try { await transitionAdminBooking(transitionTarget.booking.id, transitionTarget.action); setTransitionTarget(null); await loadBookings(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to update booking status.'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="container admin-page">
      <div className="admin-compact-page-head admin-module-head">
        <div><span className="admin-module-eyebrow">Reservation operations</span><h2>Booking Management</h2><p>Track every user reservation, payment, vehicle and parking slot.</p></div>
        <button type="button" className="admin-secondary-button" onClick={loadBookings}>↻ Refresh Data</button>
      </div>

      <div className="dashboard-stats-grid bookings-stats-grid">
        {summaryCards.map((card) => (
          <div key={card.key} className="card dashboard-stat-card">
            <div className={`dashboard-stat-icon admin-booking-stat-icon ${card.tone}`}>
              <BookingStatIcon type={card.key} />
            </div>
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
              <option>BOOKED</option>
              <option>RESERVED</option>
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
                  const canCancel = !['CANCELLED', 'COMPLETED'].includes(booking.bookingStatus);
                  const lifecycleAction = booking.bookingStatus === 'PENDING' ? ['approve', 'Approve']
                    : ['APPROVED', 'RESERVED', 'ACTIVE'].includes(booking.bookingStatus) ? ['check-in', 'Check In']
                      : booking.bookingStatus === 'OCCUPIED' ? ['check-out', 'Check Out'] : null;
                  return (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td>{formatDisplayName(booking.userName, 'User')}</td>
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
                          {lifecycleAction && <button type="button" className="btn" onClick={() => setTransitionTarget({ booking, action: lifecycleAction[0], label: lifecycleAction[1] })}>{lifecycleAction[1]}</button>}
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
                <div><strong>User Name:</strong> {formatDisplayName(selectedBooking.userName, 'User')}</div>
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
      {transitionTarget && <div className="modal-backdrop"><div className="modal-card confirm-card"><h3>{transitionTarget.label} Booking</h3><p>Confirm {transitionTarget.label.toLowerCase()} for booking #{transitionTarget.booking.id}. This updates the booking and slot together.</p><div className="manage-slots-actions"><button className="btn btn-secondary" onClick={() => setTransitionTarget(null)} disabled={actionLoading}>Cancel</button><button className="btn" onClick={confirmTransition} disabled={actionLoading}>{actionLoading ? 'Updating...' : `Confirm ${transitionTarget.label}`}</button></div></div></div>}
    </div>
  );
}
