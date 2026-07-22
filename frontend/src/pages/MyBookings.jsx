import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking } from '../services/bookingService';
import { unwrapList } from '../services/parkingService';

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
    text === 'ACTIVE' ? 'upcoming' : text === 'CANCELLED' ? 'cancelled' : text === 'COMPLETED' ? 'completed' : 'neutral';
  return <span className={`my-bookings-badge tone-${tone}`}>{text.toLowerCase()}</span>;
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

  const load = () => {
    setLoading(true);
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
    const upcoming = bookings.filter((booking) => booking.status === 'ACTIVE').length;
    const completed = bookings.filter((booking) => booking.status === 'COMPLETED').length;
    const cancelled = bookings.filter((booking) => booking.status === 'CANCELLED').length;
    return { total, upcoming, completed, cancelled };
  }, [bookings]);

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

        {!loading && bookings.length === 0 && (
          <div className="empty-state">No bookings yet. Go book a slot!</div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="dashboard-table-wrap user-responsive-table">
            <table className="dashboard-table my-bookings-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Location</th>
                  <th>Slot Details</th>
                  <th>Time</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>#{booking.bookingId || booking.id}</strong>
                      <div className="my-bookings-subline">{new Date(booking.startTime).toLocaleString()}</div>
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
                    <td>
                      <div className="my-bookings-time">
                        <div>{new Date(booking.startTime).toLocaleDateString()}</div>
                        <div className="my-bookings-subline">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="my-bookings-vehicle">
                        <strong>{booking.vehicleNumber || 'N/A'}</strong>
                        <div className="my-bookings-subline">White • Swift</div>
                      </div>
                    </td>
                    <td>
                      <strong className="my-bookings-amount">₹{booking.amount}</strong>
                      <div className="my-bookings-subline">2 Hours</div>
                    </td>
                    <td>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td>
                      <div className="my-bookings-action-cell">
                        <button type="button" className="btn btn-secondary my-bookings-view-btn" onClick={() => navigate(`/bookings/${booking.id}`)}>
                          View
                        </button>
                        {booking.status === 'ACTIVE' && (
                          <button type="button" className="btn btn-danger my-bookings-cancel-btn" onClick={() => handleCancel(booking.id)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="my-bookings-footer">
          <span>Showing 1 to {bookings.length} of {bookings.length} bookings</span>
          <div className="my-bookings-pagination">
            <button type="button" className="my-bookings-page-btn">‹</button>
            <button type="button" className="my-bookings-page-btn active">1</button>
            <button type="button" className="my-bookings-page-btn">›</button>
          </div>
        </div>
      </section>
    </div>
  );
}
