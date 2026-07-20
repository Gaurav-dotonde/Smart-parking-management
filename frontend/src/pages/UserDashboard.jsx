import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getUserDashboard } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';

const summaryCards = [
  { title: 'Active Bookings', tone: 'blue', icon: 'booking' },
  { title: 'Upcoming Bookings', tone: 'green', icon: 'car' },
  { title: 'Completed Bookings', tone: 'purple', icon: 'calendar' },
  { title: 'Cancelled Bookings', tone: 'amber', icon: 'payment' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');
    getUserDashboard()
      .then((res) => {
        if (!mounted) return;
        setDashboard(res.data || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      activeBookings: dashboard?.activeBookings || 0,
      upcomingBookings: dashboard?.upcomingBookings || 0,
      completedBookings: dashboard?.completedBookings || 0,
      cancelledBookings: dashboard?.cancelledBookings || 0,
      totalPayments: dashboard?.totalPayments || 0,
      pendingPayments: dashboard?.pendingPayments || 0,
    };
  }, [dashboard]);

  const statValues = useMemo(
    () => [
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
          <article key={card.title} className={`user-summary-card tone-${card.tone}`}>
            <div className="user-summary-head">
              <div className={`user-summary-icon tone-${card.tone}`}>
                <DashIcon name={card.icon} />
              </div>
              <span className="user-summary-title">{card.title}</span>
            </div>
            <strong className="user-summary-value">{loading ? '...' : statValues[index]}</strong>
            <span className="user-summary-note">
              {index === 0
                ? 'Current active'
                : index === 1
                  ? 'Upcoming'
                  : index === 2
                    ? 'Finished bookings'
                    : 'Payments made'}
            </span>
          </article>
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
    </div>
  );
}
