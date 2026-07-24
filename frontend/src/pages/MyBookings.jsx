import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking, extendBooking } from '../services/bookingService';
import { unwrapList } from '../services/parkingService';
import { getPaymentAvailability } from '../utils/paymentAvailability';
import { formatBookingDuration } from '../utils/formatBookingDuration';

function StatCard({ tone, label, value, subtext, icon }) {
  return (
    <article className={`my-bookings-stat tone-${tone}`}>
      <div className="my-bookings-stat-icon">{icon}</div>
      <div>
        <span className="my-bookings-stat-label">{label}</span>
        <strong className="my-bookings-stat-value">{value}</strong>
        <span className="my-bookings-stat-subtext">{subtext}</span>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const text = status || 'UNKNOWN';
  const tone =
    ['RESERVED', 'ACTIVE', 'OCCUPIED'].includes(text) ? 'upcoming' : text === 'CANCELLED' ? 'cancelled' : text === 'COMPLETED' ? 'completed' : 'neutral';
  return <span className={`my-bookings-badge tone-${tone}`}>{text.toLowerCase()}</span>;
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
}

function localDateTime(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function MyBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const confirmedBooking = location.state?.bookingConfirmed ? location.state.booking : null;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    confirmedBooking
      ? `Booking confirmed successfully! Slot ${confirmedBooking.slotNumber || ''} is reserved for you.`
      : ''
  );
  const [extensionTarget, setExtensionTarget] = useState(null);
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [extensionSaving, setExtensionSaving] = useState(false);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    getMyBookings()
      .then((res) => setBookings(unwrapList(res.data)))
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load bookings.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!location.state?.bookingConfirmed) return undefined;
    navigate(location.pathname, { replace: true, state: null });
    const timer = window.setTimeout(() => setSuccessMessage(''), 8000);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  const handleCancel = async (id) => {
    setError('');
    try {
      await cancelBooking(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const badgeClass = (status) => {
    if (status === 'ACTIVE') return 'badge badge-active';
    if (status === 'CANCELLED') return 'badge badge-cancelled';
    return 'badge badge-completed';
  };

  const stats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((booking) => ['RESERVED', 'ACTIVE', 'OCCUPIED'].includes(booking.status)).length;
    const completed = bookings.filter((booking) => booking.status === 'COMPLETED').length;
    const cancelled = bookings.filter((booking) => booking.status === 'CANCELLED').length;
    return { total, upcoming, completed, cancelled };
  }, [bookings]);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => ['RESERVED', 'ACTIVE', 'OCCUPIED'].includes(booking.status)),
    [bookings]
  );

  const confirmExtension = async () => {
    if (!extensionTarget) return;
    setExtensionSaving(true);
    setError('');
    try {
      const newEndTime = new Date(new Date(extensionTarget.endTime).getTime() + Number(extensionMinutes) * 60000);
      await extendBooking(extensionTarget.id, {
        newEndTime: localDateTime(newEndTime),
        extensionMinutes: Number(extensionMinutes),
        paymentReference: `DEMO-EXT-${Date.now()}`,
      });
      setExtensionTarget(null);
      setSuccessMessage('Booking extended successfully.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Extension could not be completed.');
    } finally {
      setExtensionSaving(false);
    }
  };

  return (
    <div className="my-bookings-page user-page-section">
      {successMessage && (
        <div className="my-bookings-success" role="status" aria-live="polite">
          <span className="my-bookings-success-icon">✓</span>
          <div>
            <strong>Parking slot booked successfully!</strong>
            <p>{successMessage}</p>
          </div>
          <button type="button" aria-label="Close success message" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}
      <section className="user-page-card my-bookings-hero">
        <div>
          <p className="user-page-eyebrow">Bookings</p>
          <h2>Track your parking reservations</h2>
          <p>Review active, upcoming, completed, and cancelled parking bookings in one place.</p>
        </div>
      </section>

      <section className="my-bookings-stats-grid">
        <StatCard tone="blue" label="Total Bookings" value={stats.total} subtext="All time" icon="📅" />
        <StatCard tone="green" label="Upcoming" value={stats.upcoming} subtext="Next 7 days" icon="🚗" />
        <StatCard tone="amber" label="Completed" value={stats.completed} subtext="All completed" icon="⏰" />
        <StatCard tone="red" label="Cancelled" value={stats.cancelled} subtext="All time" icon="✕" />
      </section>

      <section className="user-page-card my-bookings-list-card">
        <div className="my-bookings-list-head">
          <div>
            <h3>Your Booking List</h3>
            <p>Monitor booking status, timings, and amount.</p>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {loading && <p>Loading...</p>}

        {!loading && visibleBookings.length === 0 && (
          <div className="empty-state">No current bookings. Completed, cancelled, and expired bookings are available in Booking History.</div>
        )}

        {!loading && visibleBookings.length > 0 && (
          <div className="dashboard-table-wrap user-responsive-table">
            <table className="dashboard-table my-bookings-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Location</th>
                  <th>Slot Details</th>
                  <th>Booking Date</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => {
                  const paymentAvailability = getPaymentAvailability(booking.startTime);
                  return <tr key={booking.id}>
                    <td>
                      <strong>#{booking.bookingId || booking.id}</strong>
                    </td>
                    <td>
                      <div className="my-bookings-location">
                        <span className="my-bookings-location-pin">📍</span>
                        <div>
                          <strong>{booking.lotName}</strong>
                          <div className="my-bookings-subline">Basement - 1</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="my-bookings-slot-pill">{booking.slotNumber}</span>
                      <div className="my-bookings-subline">{booking.vehicleType || 'Four Wheeler'}</div>
                    </td>
                    <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                    <td>{new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <div className="my-bookings-vehicle">
                        <strong>{booking.vehicleNumber || 'N/A'}</strong>
                        <div className="my-bookings-subline">White • Swift</div>
                      </div>
                    </td>
                    <td>
                      <strong className="my-bookings-amount">₹{booking.amount}</strong>
                      <div className="my-bookings-subline">{formatBookingDuration(booking.startTime, booking.endTime)}</div>
                    </td>
                    <td>
                      <StatusBadge status={booking.overstay ? 'OVERSTAY' : booking.status} />
                      {booking.lifecycleMessage && <div className="my-bookings-subline">{booking.lifecycleMessage}</div>}
                    </td>
                    <td>
                      <div className="my-bookings-action-cell">
                        <button type="button" className="btn btn-secondary my-bookings-view-btn" onClick={() => navigate(`/bookings/${booking.id}`)}>
                          View
                        </button>
                        {booking.paymentStatus !== 'PAID' && booking.status !== 'CANCELLED' && (
                          <button type="button" className="btn my-bookings-pay-btn" disabled={!paymentAvailability.allowed} title={paymentAvailability.message} onClick={() => navigate('/user/payment-placeholder', { state: { bookingDraft: booking } })}>
                            {paymentAvailability.label}
                          </button>
                        )}
                        {['RESERVED', 'ACTIVE'].includes(booking.status) && (
                          <button type="button" className="btn btn-danger my-bookings-cancel-btn" onClick={() => handleCancel(booking.id)}>
                            Cancel
                          </button>
                        )}
                        {['ACTIVE', 'OCCUPIED'].includes(booking.status) && (
                          <button type="button" className="btn btn-secondary" onClick={() => { setExtensionTarget(booking); setExtensionMinutes(60); }}>
                            Extend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="my-bookings-footer">
          <span>Showing {visibleBookings.length} current bookings</span>
          <div className="my-bookings-pagination">
            <button type="button" className="my-bookings-page-btn">‹</button>
            <button type="button" className="my-bookings-page-btn active">1</button>
            <button type="button" className="my-bookings-page-btn">›</button>
          </div>
        </div>
      </section>
      {extensionTarget && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="dashboard-section-head"><h3>Extend Booking</h3><button type="button" className="modal-close" onClick={() => setExtensionTarget(null)}>×</button></div>
            <div className="booking-details-grid">
              <div><strong>Booking ID:</strong> #{extensionTarget.id}</div>
              <div><strong>Location:</strong> {extensionTarget.lotName}</div>
              <div><strong>Slot:</strong> {extensionTarget.slotNumber}</div>
              <div><strong>Current Start:</strong> {dateTime(extensionTarget.startTime)}</div>
              <div><strong>Current End:</strong> {dateTime(extensionTarget.endTime)}</div>
              <div><strong>Current Duration:</strong> {formatBookingDuration(extensionTarget.startTime, extensionTarget.endTime)}</div>
            </div>
            <label className="form-group"><span>Extension Duration</span><select value={extensionMinutes} onChange={(event) => setExtensionMinutes(Number(event.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option></select></label>
            <div className="booking-details-grid">
              <div><strong>New End:</strong> {dateTime(new Date(new Date(extensionTarget.endTime).getTime() + extensionMinutes * 60000))}</div>
              <div><strong>Additional Amount:</strong> Calculated securely by server</div>
              <div><strong>Final Amount:</strong> Current ₹{extensionTarget.amount} + extension</div>
              <div><strong>Payment:</strong> Required before confirmation</div>
            </div>
            <div className="manage-slots-actions"><button type="button" className="btn btn-secondary" onClick={() => setExtensionTarget(null)}>Cancel</button><button type="button" className="btn" disabled={extensionSaving} onClick={confirmExtension}>{extensionSaving ? 'Extending...' : 'Confirm Extension'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
