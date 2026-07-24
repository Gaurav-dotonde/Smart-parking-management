import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getUserDashboard } from '../services/userService';
import { getMyBookings } from '../services/bookingService';
import { unwrapList } from '../services/parkingService';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';

const summaryCards = [
  { title: 'Total Bookings', tone: 'blue', icon: 'booking', to: '/user/booking-history?status=ALL' },
  { title: 'Active Bookings', tone: 'blue', icon: 'booking', to: '/user/bookings?status=ACTIVE' },
  { title: 'Upcoming Bookings', tone: 'green', icon: 'car', to: '/user/bookings?status=UPCOMING' },
  { title: 'Completed Bookings', tone: 'purple', icon: 'calendar', to: '/user/booking-history?status=COMPLETED' },
  { title: 'Cancelled Bookings', tone: 'amber', icon: 'payment', to: '/user/booking-history?status=CANCELLED' },
];

const quickActions = [
  { label: 'Find Parking', to: '/user/find-parking', tone: 'blue', icon: 'pin' },
  { label: 'View Available Slots', to: '/user/available-slots', tone: 'green', icon: 'slots' },
  { label: 'My Bookings', to: '/user/bookings', tone: 'purple', icon: 'booking' },
];

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function DashIcon({ name }) {
  const commonProps = {
    className: 'user-dashboard-mini-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'booking':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'car':
      return (
        <svg {...commonProps}>
          <path d="M5.5 14.5L7.2 10.2C7.5 9.45 8.22 9 9.03 9H14.97C15.78 9 16.5 9.45 16.8 10.2L18.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 14.5H19.5V17.2C19.5 17.64 19.14 18 18.7 18H5.3C4.86 18 4.5 17.64 4.5 17.2V14.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="8.2" cy="15.7" r="0.9" fill="currentColor" />
          <circle cx="15.8" cy="15.7" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'payment':
      return (
        <svg {...commonProps}>
          <rect x="4" y="7" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10H20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...commonProps}>
          <path d="M12 21C12 21 7 15.9 7 11.5C7 8.46243 9.46243 6 12.5 6C15.5376 6 18 8.46243 18 11.5C18 15.9 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12.5" cy="11.5" r="1.8" fill="currentColor" />
        </svg>
      );
    case 'slots':
      return (
        <svg {...commonProps}>
          <path d="M4 8.5C4 7.11929 5.11929 6 6.5 6H9.5L11 8H17.5C18.8807 8 20 9.11929 20 10.5V16.5C20 17.8807 18.8807 19 17.5 19H6.5C5.11929 19 4 17.8807 4 16.5V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');
    Promise.allSettled([getUserDashboard(), getMyBookings()])
      .then(([dashboardResult, bookingsResult]) => {
        if (!mounted) return;
        if (dashboardResult.status === 'fulfilled') {
          setDashboard(dashboardResult.value.data || null);
        }
        if (bookingsResult.status === 'fulfilled') {
          setBookings(unwrapList(bookingsResult.value.data));
        }
        if (dashboardResult.status === 'rejected' && bookingsResult.status === 'rejected') {
          const reason = bookingsResult.reason || dashboardResult.reason;
          setError(reason?.response?.data?.message || 'Failed to load dashboard data.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (bookings.length > 0) {
      return {
        totalBookings: bookings.length,
        activeBookings: bookings.filter((booking) => ['ACTIVE', 'OCCUPIED'].includes(booking.status)).length,
        upcomingBookings: bookings.filter((booking) => ['PENDING', 'RESERVED', 'APPROVED', 'CONFIRMED'].includes(booking.status)).length,
        completedBookings: bookings.filter((booking) => booking.status === 'COMPLETED').length,
        cancelledBookings: bookings.filter((booking) => booking.status === 'CANCELLED').length,
        totalPayments: bookings.filter((booking) => booking.paymentStatus === 'PAID').length,
        pendingPayments: bookings.filter((booking) => ['UNPAID', 'PENDING'].includes(booking.paymentStatus)).length,
      };
    }
    return {
      totalBookings: dashboard?.totalBookings || bookings.length || 0,
      activeBookings: dashboard?.activeBookings || 0,
      upcomingBookings: dashboard?.upcomingBookings || 0,
      completedBookings: dashboard?.completedBookings || 0,
      cancelledBookings: dashboard?.cancelledBookings || 0,
      totalPayments: dashboard?.totalPayments || 0,
      pendingPayments: dashboard?.pendingPayments || 0,
    };
  }, [bookings, dashboard]);

  const recentBookings = useMemo(() => {
    const source = bookings.length > 0 ? bookings : (dashboard?.recentBookings || []);
    return source
      .slice(0, 5)
      .sort((first, second) => Number(first.bookingId || first.id || 0) - Number(second.bookingId || second.id || 0));
  }, [bookings, dashboard]);

  const statValues = useMemo(
    () => [
      stats.totalBookings,
      stats.activeBookings,
      stats.upcomingBookings,
      stats.completedBookings,
      stats.cancelledBookings,
    ],
    [stats]
  );
  const firstName = formatDisplayName(user?.name, 'User').split(' ').filter(Boolean)[0] || 'User';

  return (
    <div className="user-dashboard user-page-section">
      <section className="user-dashboard-welcome user-page-card">
        <div className="user-dashboard-hero-copy">
          <h1>Welcome Back, {firstName} <span aria-hidden="true">👋</span></h1>
          <p>Manage your parking bookings, vehicles, and payments from your dashboard.</p>
        </div>
      </section>

      {error && <p className="error-text user-dashboard-error">{error}</p>}

      <section className="user-summary-grid">
        {summaryCards.map((card, index) => (
          <NavLink key={card.title} to={card.to} className={`user-summary-card user-clickable-card tone-${card.tone}`} aria-label={`View ${card.title}`}>
            <div className="user-summary-head">
              <div className={`user-summary-icon tone-${card.tone}`}>
                <DashIcon name={card.icon} />
              </div>
              <span className="user-summary-title">{card.title}</span>
            </div>
            <strong className="user-summary-value">{loading ? '...' : statValues[index]}</strong>
            <span className="user-summary-note">
              {index === 0
                ? 'All bookings'
                : index === 1
                  ? 'Current active'
                  : index === 2
                    ? 'Upcoming'
                    : index === 3
                      ? 'Finished bookings'
                      : 'Cancelled bookings'}
            </span>
            <span className="user-card-link-hint">View details <span aria-hidden="true">→</span></span>
          </NavLink>
        ))}
      </section>

      <section className="user-quick-actions user-page-card">
        <div className="user-section-head">
          <div>
            <h3>Quick Actions</h3>
            <p>Move to the most common parking tasks.</p>
          </div>
        </div>
        <div className="user-action-row">
          {quickActions.map((action) => (
            <NavLink key={action.to} to={action.to} className={`user-action-btn tone-${action.tone}`}>
              <span className={`user-action-icon tone-${action.tone}`}>
                <DashIcon name={action.icon} />
              </span>
              <span>{action.label}</span>
            </NavLink>
          ))}
        </div>
      </section>

      <section className="user-dashboard-recent user-page-card">
        <div className="user-section-head user-dashboard-recent-head">
          <div>
            <h3>Recent Bookings</h3>
            <p>Your latest parking reservations and their current status.</p>
          </div>
          <NavLink to="/user/bookings" className="btn btn-secondary">View all bookings</NavLink>
        </div>

        {loading && <p className="user-dashboard-recent-state">Loading bookings...</p>}
        {!loading && recentBookings.length === 0 && (
          <div className="empty-state">No bookings found. Your new reservations will appear here.</div>
        )}
        {!loading && recentBookings.length > 0 && (
          <div className="user-responsive-table">
            <table className="user-dashboard-bookings-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Location</th>
                  <th>Slot</th>
                  <th>Start time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>#{booking.bookingId || booking.id}</strong></td>
                    <td>{booking.lotName || booking.parkingLot || 'Parking location'}</td>
                    <td>{booking.slotNumber || 'N/A'}</td>
                    <td>{booking.startTime ? new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</td>
                    <td><span className={`user-dashboard-status status-${String(booking.status || 'unknown').toLowerCase()}`}>{booking.status || 'UNKNOWN'}</span></td>
                    <td><NavLink to={`/bookings/${booking.id}`} className="user-dashboard-booking-link">View</NavLink></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
