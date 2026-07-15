import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getMyBookings } from '../services/bookingService';

function StatCard({ tone, label, value, subtext, icon }) {
  return (
    <article className={`payments-stat tone-${tone}`}>
      <div className="payments-stat-icon">{icon}</div>
      <div>
        <span className="payments-stat-label">{label}</span>
        <strong className="payments-stat-value">{value}</strong>
        <span className="payments-stat-subtext">{subtext}</span>
      </div>
    </article>
  );
}

function Badge({ tone, children }) {
  return <span className={`payments-badge tone-${tone}`}>{children}</span>;
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
  if (status === 'ACTIVE' || status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'failed';
  return 'success';
}

export default function Payments() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
        setError(err.response?.data?.message || 'Failed to load payment records.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const locations = useMemo(() => {
    return Array.from(new Set(bookings.map((booking) => booking.lotName).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [bookings]);

  const filteredPayments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return bookings
      .slice()
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .filter((booking) => {
        const bookingDate = new Date(booking.startTime);
        const matchesQuery =
          !query ||
          [booking.id, booking.lotName, booking.slotNumber, booking.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        const matchesStatus = statusFilter === 'All Status' || booking.status === statusFilter;
        const matchesLocation = locationFilter === 'All Locations' || booking.lotName === locationFilter;
        const matchesFrom = !from || bookingDate >= from;
        const matchesTo = !to || bookingDate <= to;
        return matchesQuery && matchesStatus && matchesLocation && matchesFrom && matchesTo;
      });
  }, [bookings, searchText, statusFilter, locationFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((booking) => booking.status === 'ACTIVE').length;
    const cancelledBookings = bookings.filter((booking) => booking.status === 'CANCELLED').length;
    return { totalSpent, totalBookings, activeBookings, cancelledBookings };
  }, [bookings]);

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('All Status');
    setLocationFilter('All Locations');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="payments-page user-page-section">
      <section className="user-page-card payments-hero">
        <div>
          <p className="user-page-eyebrow">Payments</p>
          <h2>Review your payment activity</h2>
          <p>Payment totals are derived from your booking records until a dedicated payment module is connected.</p>
        </div>
      </section>

      <section className="payments-stats-grid">
        <StatCard tone="blue" label="Total Spent" value={loading ? '...' : formatCurrency(stats.totalSpent)} subtext="All time" icon="💳" />
        <StatCard tone="green" label="Booking Payments" value={loading ? '...' : stats.totalBookings} subtext="Linked bookings" icon="🟢" />
        <StatCard tone="amber" label="Active Bookings" value={loading ? '...' : stats.activeBookings} subtext="Currently active" icon="⏰" />
        <StatCard tone="purple" label="Cancelled Bookings" value={loading ? '...' : stats.cancelledBookings} subtext="No payment record" icon="🏷" />
      </section>

      <section className="payments-wallet-card user-page-card">
        <div className="payments-wallet-left">
          <div className="payments-wallet-icon">₹</div>
          <div>
            <span className="payments-wallet-label">Payment Summary</span>
            <strong className="payments-wallet-value">{loading ? '...' : formatCurrency(stats.totalSpent)}</strong>
            <p>Derived from your booking data</p>
          </div>
        </div>
        <NavLink to="/user/bookings" className="btn payments-add-money-btn">
          View My Bookings
        </NavLink>
      </section>

      <section className="user-page-card payments-tabs-card">
        <div className="payments-tabs">
          <button type="button" className="payments-tab active">Payment History</button>
          <button type="button" className="payments-tab">Pending</button>
          <button type="button" className="payments-tab">Refunds</button>
        </div>

        <div className="payments-filter-grid user-page-toolbar">
          <div className="form-group">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All Status</option>
              <option>ACTIVE</option>
              <option>COMPLETED</option>
              <option>CANCELLED</option>
            </select>
          </div>
          <div className="form-group">
            <label>Location</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option>All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group payments-search-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by booking ID"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-secondary payments-filter-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </section>

      <section className="payments-main-grid">
        <div className="user-page-card payments-table-card">
          <div className="payments-list-head">
            <h3>Payment History</h3>
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading && <p>Loading payment records...</p>}

          {!loading && filteredPayments.length === 0 && (
            <div className="empty-state">
              No payment records available for the selected filters.
            </div>
          )}

          {!loading && filteredPayments.length > 0 && (
          <div className="dashboard-table-wrap user-responsive-table">
              <table className="dashboard-table payments-table">
                <thead>
                  <tr>
                    <th>Payment Ref</th>
                    <th>Booking ID</th>
                    <th>Location</th>
                    <th>Date &amp; Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>PAY-{booking.id}</strong>
                        <div className="payments-subline">Linked booking payment</div>
                      </td>
                      <td>
                        <strong>#{booking.id}</strong>
                        <div className="payments-subline">{booking.slotNumber || 'Parking slot'}</div>
                      </td>
                      <td>
                        <div className="payments-location">
                          <span className="payments-location-pin">📍</span>
                          <div>
                            <strong>{booking.lotName || 'Parking Lot'}</strong>
                            <div className="payments-subline">{booking.slotNumber || 'Slot not available'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{formatDate(booking.startTime)}</div>
                        <div className="payments-subline">{formatTime(booking.startTime)}</div>
                      </td>
                      <td>
                        <strong className="payments-amount">{formatCurrency(booking.amount)}</strong>
                        <div className="payments-subline">From booking record</div>
                      </td>
                      <td>
                        <Badge tone={statusTone(booking.status)}>{booking.status || 'UNKNOWN'}</Badge>
                      </td>
                      <td>
                        <button type="button" className="btn btn-secondary payments-view-btn">
                          View Booking
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="payments-footer">
            <span>
              Showing {filteredPayments.length} of {bookings.length} bookings
            </span>
          </div>
        </div>

        <aside className="payments-sidebar">
          <div className="user-page-card payments-methods-card">
            <h3>Payment Summary</h3>
            <div className="payments-method-item">Booking-linked records <span>{bookings.length}</span></div>
            <div className="payments-method-item">Active bookings <span>{stats.activeBookings}</span></div>
            <div className="payments-method-item">Cancelled bookings <span>{stats.cancelledBookings}</span></div>
            <div className="payments-method-item">Standalone payment methods <span>Not connected yet</span></div>
          </div>

          <div className="user-page-card payments-secure-card">
            <strong>Secure Payment Handling</strong>
            <p>Payment information will stay protected once the payment module is connected.</p>
          </div>

          <div className="user-page-card payments-help-card">
            <strong>Need Help?</strong>
            <p>If you face any payment issue, our support team can assist you.</p>
            <button type="button" className="btn payments-support-btn">
              Contact Support
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
