import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDisplayName } from '../utils/formatDisplayName';
import { cancelAdminBooking, extendAdminBooking, getAdminBookingById, getAdminBookings, transitionAdminBooking } from '../services/bookingService';
import { onParkingDataChanged } from '../services/dataSync';
import { unwrapList } from '../services/parkingService';
import { getAdminRefunds } from '../services/refundService';

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

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const localDateTime = (value) => {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getTodayInputValue = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [extensionTarget, setExtensionTarget] = useState(null);
  const [extensionMinutes, setExtensionMinutes] = useState(60);

  useEffect(() => {
    const requestedStatus = searchParams.get('status');
    const requestedDate = searchParams.get('date');
    setBookingStatus(requestedStatus === 'BOOKED' || requestedStatus === 'ACTIVE_STATUSES' ? 'ACTIVE_STATUSES' : (requestedStatus || 'All'));
    setDateFilter(requestedDate === 'today' ? getTodayInputValue() : '');
  }, [searchParams]);

  const applySummaryFilter = (cardKey) => {
    setSearch('');
    setPaymentStatus('All');

    if (cardKey === 'today') {
      setBookingStatus('All');
      setDateFilter(getTodayInputValue());
      setSearchParams({ date: 'today' });
      return;
    }

    setDateFilter('');
    if (cardKey === 'total') {
      setBookingStatus('All');
      setSearchParams({});
      return;
    }

    const statusByCard = {
      active: 'ACTIVE_STATUSES',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    };
    const status = statusByCard[cardKey];
    setBookingStatus(status);
    setSearchParams({ status });
  };

  const loadBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [bookingResponse, refundResponse] = await Promise.all([
        getAdminBookings(),
        getAdminRefunds({ page: 0, size: 200 }),
      ]);
      const latestRefundByBooking = new Map();
      (refundResponse.data?.content || []).forEach((refund) => {
        if (!latestRefundByBooking.has(String(refund.bookingId))) latestRefundByBooking.set(String(refund.bookingId), refund);
      });
      setBookings(unwrapList(bookingResponse.data).map((booking) => ({
        ...booking,
        refundStatus: latestRefundByBooking.get(String(booking.id))?.refundStatus || null,
        refundId: latestRefundByBooking.get(String(booking.id))?.refundId || null,
      })));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    const refresh = () => loadBookings(true);
    const unsubscribe = onParkingDataChanged(refresh);
    const interval = window.setInterval(refresh, 60000);
    return () => { unsubscribe(); window.clearInterval(interval); };
  }, []);

  const filteredBookings = useMemo(() => (
    bookings.filter((booking) => {
      const term = search.toLowerCase();
      const matchesSearch = !term
        || booking.userName?.toLowerCase().includes(term)
        || booking.vehicleNumber?.toLowerCase().includes(term)
        || booking.slotNumber?.toLowerCase().includes(term);

      const matchesBookingStatus = bookingStatus === 'All'
        || (bookingStatus === 'ACTIVE_STATUSES' && ['RESERVED', 'ACTIVE', 'OCCUPIED'].includes(booking.bookingStatus))
        || booking.bookingStatus === bookingStatus;
      const matchesPaymentStatus = paymentStatus === 'All' || booking.paymentStatus === paymentStatus;
      const matchesDate = !dateFilter || new Date(booking.startTime).toISOString().slice(0, 10) === dateFilter;

      return matchesSearch && matchesBookingStatus && matchesPaymentStatus && matchesDate;
    })
  ), [bookings, search, bookingStatus, paymentStatus, dateFilter]);

  const groupedBookings = useMemo(() => {
    const groups = new Map();
    filteredBookings.forEach((booking) => {
      const key = [booking.email, booking.parkingLot, booking.startTime, booking.endTime].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
    });
    return [...groups.values()].map((items) => {
      const first = items[0];
      const bookingStatuses = [...new Set(items.map((item) => item.bookingStatus))];
      const paymentStatuses = [...new Set(items.map((item) => item.paymentStatus))];
      return {
        ...first,
        id: items.map((item) => item.id).join(', '),
        slotNumber: items.map((item) => item.slotNumber).join(', '),
        floor: [...new Set(items.map((item) => item.floor ?? 'N/A'))].join(', '),
        vehicleNumber: items.map((item) => item.vehicleNumber).join(', '),
        bookingStatus: bookingStatuses.length === 1 ? bookingStatuses[0] : 'MIXED',
        paymentStatus: paymentStatuses.length === 1 ? paymentStatuses[0] : 'MIXED',
        refundStatus: [...new Set(items.map((item) => item.refundStatus).filter(Boolean))].join(', ') || null,
        amount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        _items: items,
        _sortId: Math.min(...items.map((item) => Number(item.id))),
      };
    }).sort((a, b) => a._sortId - b._sortId);
  }, [filteredBookings]);

  const summary = useMemo(() => ({
    total: bookings.length,
    today: bookings.filter((booking) => isSameDay(booking.startTime)).length,
    active: bookings.filter((booking) => ['RESERVED', 'ACTIVE', 'OCCUPIED'].includes(booking.bookingStatus)).length,
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
      const targets = cancelTarget._items || [cancelTarget];
      await Promise.all(
        targets
          .filter((item) => !['CANCELLED', 'COMPLETED'].includes(item.bookingStatus))
          .map((item) => cancelAdminBooking(item.id))
      );
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

  const openGroupDetails = (booking) => {
    if (booking._items?.length > 1) {
      setDetailsError('');
      setSelectedBooking(booking);
    } else {
      openDetails(booking._items?.[0]?.id || booking.id);
    }
  };

  const confirmTransition = async () => {
    if (!transitionTarget) return;
    setActionLoading(true);
    try { await transitionAdminBooking(transitionTarget.booking.id, transitionTarget.action); setTransitionTarget(null); await loadBookings(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to update booking status.'); }
    finally { setActionLoading(false); }
  };

  const confirmExtension = async () => {
    if (!extensionTarget) return;
    setActionLoading(true);
    try {
      const newEnd = new Date(new Date(extensionTarget.endTime).getTime() + extensionMinutes * 60000);
      await extendAdminBooking(extensionTarget.id, {
        newEndTime: localDateTime(newEnd),
        extensionMinutes,
        paymentReference: `ADMIN-EXT-${Date.now()}`,
      });
      setExtensionTarget(null);
      await loadBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Extension could not be completed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container admin-page">
      <div className="admin-compact-page-head admin-module-head">
        <div><span className="admin-module-eyebrow">Reservation operations</span><h2>Booking Management</h2><p>Track every user reservation, payment, vehicle and parking slot.</p></div>
        <button type="button" className="admin-secondary-button" onClick={loadBookings}>↻ Refresh Data</button>
      </div>

      <div className="dashboard-stats-grid bookings-stats-grid">
        {summaryCards.map((card) => (
          <button
            type="button"
            key={card.key}
            className="card dashboard-stat-card booking-summary-filter-card"
            onClick={() => applySummaryFilter(card.key)}
            aria-label={`Show ${card.title.toLowerCase()} in bookings table`}
          >
            <div className={`dashboard-stat-icon admin-booking-stat-icon ${card.tone}`}>
              <BookingStatIcon type={card.key} />
            </div>
            <div>
              <span className="dashboard-stat-title">{card.title}</span>
              <strong className="dashboard-stat-value">{summary[card.key]}</strong>
            </div>
          </button>
        ))}
      </div>

      <section className="card bookings-card admin-bookings-table-card">
        <div className="dashboard-section-head">
          <h3>Bookings Table</h3>
          <p>Manage booking records and admin actions.</p>
        </div>

        {loading && <div className="empty-state">Loading bookings...</div>}
        {!loading && error && <div className="error-text">{error}</div>}
        {!loading && !error && !groupedBookings.length && (
          <div className="empty-state">No bookings found.</div>
        )}

        {!loading && !error && !!groupedBookings.length && (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table admin-bookings-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Parking Lot</th>
                  <th>Slot Number</th>
                  <th>Floor</th>
                  <th>Vehicle Number</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Booking Status</th>
                  <th>Payment Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedBookings.map((booking) => {
                  const canCancel = ['RESERVED', 'ACTIVE'].includes(booking.bookingStatus);
                  const lifecycleAction = booking._items.length === 1 && (['RESERVED', 'ACTIVE'].includes(booking.bookingStatus) ? ['check-in', 'Check In']
                      : booking.bookingStatus === 'OCCUPIED' ? ['check-out', 'Check Out'] : null);
                  return (
                    <tr key={`${booking.email}-${booking.id}`}>
                      <td><strong>{booking._items.length > 1 ? `Batch (${booking._items.length})` : `#${booking.id}`}</strong>{booking._items.length > 1 && <small>IDs: {booking.id}</small>}</td>
                      <td>{formatDisplayName(booking.userName, 'User')}</td>
                      <td>{booking.email}</td>
                      <td>{booking.parkingLot}</td>
                      <td>{booking.slotNumber}</td>
                      <td>{booking.floor ?? 'N/A'}</td>
                      <td>{booking.vehicleNumber}</td>
                      <td>{formatDate(booking.startTime)}</td>
                      <td>{formatDate(booking.endTime)}</td>
                      <td>
                        <span className={`badge ${booking.bookingStatus === 'ACTIVE' ? 'badge-active' : booking.bookingStatus === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled'}`}>
                          {booking.overstay ? 'OVERSTAY' : booking.bookingStatus}
                        </span>
                      </td>
                      <td><span>{booking.paymentStatus}</span>{booking.bookingStatus === 'CANCELLED' && booking.refundStatus && <small><span className={`refund-status-badge ${String(booking.refundStatus).toLowerCase()}`}>REFUND {booking.refundStatus}</span></small>}</td>
                      <td>Rs {booking.amount}</td>
                      <td>
                        <div className="manage-slots-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => openGroupDetails(booking)}>
                            View Details
                          </button>
                          {lifecycleAction && <button type="button" className="btn" onClick={() => setTransitionTarget({ booking, action: lifecycleAction[0], label: lifecycleAction[1] })}>{lifecycleAction[1]}</button>}
                          {booking._items.length === 1 && ['ACTIVE', 'OCCUPIED'].includes(booking.bookingStatus) && <button type="button" className="btn btn-secondary" onClick={() => { setExtensionTarget(booking); setExtensionMinutes(60); }}>Extend</button>}
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
        <div className="modal-backdrop booking-details-backdrop">
          <div className="modal-card booking-details-modal">
            <div className="dashboard-section-head">
              <h3>Booking Details</h3>
              <button type="button" className="modal-close" aria-label="Close booking details" onClick={() => { setSelectedBooking(null); setDetailsError(''); }}>
                ×
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
                <div><strong>Start Date:</strong> {formatDate(selectedBooking.startTime)}</div>
                <div><strong>End Date:</strong> {formatDate(selectedBooking.endTime)}</div>
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
      {extensionTarget && <div className="modal-backdrop"><div className="modal-card"><div className="dashboard-section-head"><h3>Extend Booking #{extensionTarget.id}</h3><button className="modal-close" onClick={() => setExtensionTarget(null)}>×</button></div><div className="booking-details-grid"><div><strong>Location:</strong> {extensionTarget.parkingLot}</div><div><strong>Slot:</strong> {extensionTarget.slotNumber}</div><div><strong>Current Start:</strong> {new Date(extensionTarget.startTime).toLocaleString()}</div><div><strong>Current End:</strong> {new Date(extensionTarget.endTime).toLocaleString()}</div></div><label className="form-group"><span>Extension Duration</span><select value={extensionMinutes} onChange={(event) => setExtensionMinutes(Number(event.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select></label><p>New end time: <strong>{new Date(new Date(extensionTarget.endTime).getTime() + extensionMinutes * 60000).toLocaleString()}</strong></p><p>Additional amount and overlap will be validated by the server.</p><div className="manage-slots-actions"><button className="btn btn-secondary" onClick={() => setExtensionTarget(null)}>Cancel</button><button className="btn" onClick={confirmExtension} disabled={actionLoading}>{actionLoading ? 'Extending...' : 'Confirm Extension'}</button></div></div></div>}
    </div>
  );
}
