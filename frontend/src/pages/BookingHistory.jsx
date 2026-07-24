import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings } from '../services/bookingService';

function StatCard({ tone, label, value, subtext, icon }) {
  return (
    <article className={`booking-history-stat tone-${tone}`}>
      <div className="booking-history-stat-icon">{icon}</div>
      <div>
        <span className="booking-history-stat-label">{label}</span>
        <strong className="booking-history-stat-value">{value}</strong>
        <span className="booking-history-stat-subtext">{subtext}</span>
      </div>
    </article>
  );
}

function Badge({ tone, children }) {
  return <span className={`booking-history-badge tone-${tone}`}>{children}</span>;
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusTone(status) {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'ACTIVE') return 'green';
  return 'expired';
}

export default function BookingHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');
    getMyBookings()
      .then((res) => {
        if (!mounted) return;
        setBookings(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load booking history.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings
      .slice()
      .filter((booking) => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(booking.status))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [bookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((booking) => booking.status === 'COMPLETED').length;
    const cancelled = bookings.filter((booking) => booking.status === 'CANCELLED').length;
    const active = bookings.filter((booking) => booking.status === 'ACTIVE').length;
    return { total, completed, cancelled, active };
  }, [bookings]);

  return (
    <div className="booking-history-page user-page-section">
      <section className="user-page-card booking-history-hero">
        <div>
          <p className="user-page-eyebrow">Booking History</p>
          <h2>Review your past parking bookings</h2>
          <p>Track active, completed, and cancelled bookings from one place.</p>
        </div>
      </section>

      <section className="booking-history-stats-grid">
        <StatCard tone="blue" label="Total Bookings" value={loading ? '...' : stats.total} subtext="All time" icon="📅" />
        <StatCard tone="green" label="Completed" value={loading ? '...' : stats.completed} subtext="Finished bookings" icon="✓" />
        <StatCard tone="red" label="Cancelled" value={loading ? '...' : stats.cancelled} subtext="Cancelled bookings" icon="✕" />
        <StatCard tone="amber" label="Active" value={loading ? '...' : stats.active} subtext="Currently active" icon="⏱" />
      </section>

      <section className="user-page-card booking-history-list-card">
        <div className="booking-history-list-head">
          <div>
            <h3>Your Booking History</h3>
          </div>
          <div className="booking-history-sort">
            <span>Sort by</span>
            <div className="booking-history-sort-pill">Newest First</div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {loading && <p>Loading booking history...</p>}

        {!loading && filteredBookings.length === 0 && (
          <div className="empty-state">
            No booking history available.
          </div>
        )}

        {!loading && filteredBookings.length > 0 && (
          <div className="dashboard-table-wrap user-responsive-table">
            <table className="dashboard-table booking-history-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Location</th>
                  <th>Slot Details</th>
                  <th>Booking Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>#{booking.id}</strong>
                      <div className="booking-history-subline">Booking record</div>
                    </td>
                    <td>
                      <div className="booking-history-location">
                        <span className="booking-history-location-pin">📍</span>
                        <div>
                          <strong>{booking.lotName || 'Parking Lot'}</strong>
                          <div className="booking-history-subline">{booking.slotNumber || 'Slot not available'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone="green">{booking.slotNumber || 'N/A'}</Badge>
                      <div className="booking-history-subline">Parking slot</div>
                    </td>
                    <td>{formatDate(booking.startTime)}</td>
                    <td>
                      <strong className="booking-history-amount">{formatCurrency(booking.amount)}</strong>
                      <div className="booking-history-subline">Derived from booking total</div>
                    </td>
                    <td>
                      <Badge tone={statusTone(booking.status)}>{booking.status || 'UNKNOWN'}</Badge>
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary booking-history-view-btn" onClick={() => navigate(`/bookings/${booking.id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="booking-history-footer">
          <span>
            Showing {filteredBookings.length} of {bookings.length} bookings
          </span>
        </div>
      </section>
    </div>
  );
}
