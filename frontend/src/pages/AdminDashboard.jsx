import React, { useEffect, useMemo, useState } from 'react';
import { getAdminBookings } from '../services/bookingService';
import { getAllLots, getSlots, unwrapList } from '../services/parkingService';
import { getAdminUsers } from '../services/userService';
import { onParkingDataChanged } from '../services/dataSync';

const dashboardCards = [
  { title: 'Total Parking Lots', key: 'totalLots', tone: 'navy', icon: 'slots' },
  { title: 'Total Slots', key: 'totalSlots', tone: 'blue', icon: 'slots' },
  { title: 'Available Slots', key: 'availableSlots', tone: 'green', icon: 'available' },
  { title: 'Booked Slots', key: 'bookedSlots', tone: 'red', icon: 'booked' },
  { title: 'Total Users', key: 'totalUsers', tone: 'purple', icon: 'users' },
  { title: "Today's Bookings", key: 'todayBookings', tone: 'amber', icon: 'calendar' },
  { title: 'Total Revenue', key: 'totalRevenue', tone: 'navy', icon: 'revenue' },
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

const formatMoney = (value) => `Rs ${(value || 0).toLocaleString()}`;

function DashboardIcon({ name }) {
  const commonProps = {
    className: 'dashboard-stat-svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'slots':
      return (
        <svg {...commonProps}>
          <path d="M4 8.5C4 7.11929 5.11929 6 6.5 6H9.5L11 8H17.5C18.8807 8 20 9.11929 20 10.5V16.5C20 17.8807 18.8807 19 17.5 19H6.5C5.11929 19 4 17.8807 4 16.5V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'available':
      return (
        <svg {...commonProps}>
          <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 12L10.8 14.3L15.8 9.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'booked':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M8.5 12C10.433 12 12 10.433 12 8.5C12 6.567 10.433 5 8.5 5C6.567 5 5 6.567 5 8.5C5 10.433 6.567 12 8.5 12Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.5 10C17.1569 10 18.5 8.65685 18.5 7C18.5 5.34315 17.1569 4 15.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3.5 18C4.33398 15.8246 6.50444 14.5 9 14.5H10C12.4956 14.5 14.666 15.8246 15.5 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 14.5C18.0024 14.5 19.773 15.5843 20.7 17.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 14H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'revenue':
      return (
        <svg {...commonProps}>
          <path d="M12 4V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 7.5C15.2 6.5 13.9 6 12.3 6C10.1 6 8.5 7.1 8.5 8.8C8.5 10.3 9.7 11.1 12 11.6C14.4 12.1 15.5 12.9 15.5 14.4C15.5 16.2 13.8 17.4 11.4 17.4C9.7 17.4 8.2 16.8 7.2 15.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [bookingsRes, usersRes, lotsRes] = await Promise.all([
          getAdminBookings(),
          getAdminUsers(),
          getAllLots(),
        ]);

        const slotGroups = await Promise.all(
          unwrapList(lotsRes.data).map(async (lot) => {
            const res = await getSlots(lot.id);
            return unwrapList(res.data);
          })
        );

        if (!alive) return;
        setBookings(unwrapList(bookingsRes.data));
        setUsers(unwrapList(usersRes.data));
        setLots(unwrapList(lotsRes.data));
        setSlots(slotGroups.flat());
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.message || 'Failed to load dashboard data.');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    const unsubscribe = onParkingDataChanged(() => {
      loadDashboard();
    });
    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);

    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const summary = useMemo(() => {
    const availableSlots = slots.filter((slot) => slot.status === 'AVAILABLE').length;
    const bookedSlots = slots.filter((slot) => slot.status === 'BOOKED' || slot.status === 'RESERVED' || slot.status === 'OCCUPIED').length;
    const maintenanceSlots = slots.filter((slot) => slot.status === 'DISABLED' || slot.status === 'MAINTENANCE').length;
    const totalRevenue = bookings
      .filter((booking) => booking.paymentStatus === 'PAID')
      .reduce((sum, booking) => sum + (booking.amount || 0), 0);

    return {
      totalSlots: slots.length,
      totalLots: lots.length,
      availableSlots,
      bookedSlots,
      totalUsers: users.length,
      todayBookings: bookings.filter((booking) => isSameDay(booking.startTime)).length,
      totalRevenue: formatMoney(totalRevenue),
      maintenanceSlots,
    };
  }, [bookings, users, lots, slots]);

  const recentBookings = useMemo(
    () => [...bookings]
      .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
      .slice(0, 4),
    [bookings]
  );

  const slotStatus = useMemo(() => ([
    { label: 'Available Slots', value: summary.availableSlots, tone: 'available' },
    { label: 'Booked Slots', value: summary.bookedSlots, tone: 'booked' },
    { label: 'Maintenance Slots', value: summary.maintenanceSlots, tone: 'maintenance' },
  ]), [summary]);

  const totalStatusSlots = Math.max(
    1,
    summary.availableSlots + summary.bookedSlots + summary.maintenanceSlots
  );

  return (
    <div className="container admin-page">
      <h2 className="page-title">Dashboard</h2>
      <p className="subtitle">Admin dashboard overview for Smart Parking System.</p>

      {loading && <div className="empty-state">Loading dashboard...</div>}
      {!loading && error && <div className="error-text">{error}</div>}

      {!loading && !error && (
        <>
          <div className="dashboard-stats-grid">
            {dashboardCards.map((stat) => (
              <div key={stat.title} className="card dashboard-stat-card">
                <div className={`dashboard-stat-icon ${stat.tone}`}>
                  <DashboardIcon name={stat.icon} />
                </div>
                <div>
                  <span className="dashboard-stat-title">{stat.title}</span>
                  <strong className="dashboard-stat-value">{summary[stat.key]}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-sections-grid">
            <section className="card dashboard-section dashboard-table-section">
              <div className="dashboard-section-head">
                <h3>Recent Bookings</h3>
                <p>Recent admin-side booking activity.</p>
              </div>

              {!recentBookings.length ? (
                <div className="empty-state">No bookings available.</div>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>User Name</th>
                        <th>Slot Number</th>
                        <th>Vehicle Number</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>{booking.id}</td>
                          <td>{booking.userName}</td>
                          <td>{booking.slotNumber}</td>
                          <td>{booking.vehicleNumber || 'N/A'}</td>
                          <td>{formatDateTime(booking.startTime)}</td>
                          <td>{formatDateTime(booking.endTime)}</td>
                          <td>
                            <span className={`badge ${
                              booking.bookingStatus === 'ACTIVE'
                                ? 'badge-active'
                                : booking.bookingStatus === 'COMPLETED'
                                  ? 'badge-completed'
                                  : 'badge-cancelled'
                            }`}
                            >
                              {booking.bookingStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card dashboard-section">
              <div className="dashboard-section-head">
                <h3>Slot Status Overview</h3>
                <p>Quick visual summary of parking slot distribution.</p>
              </div>

              <div className="slot-status-list">
                {slotStatus.map((item) => (
                  <div key={item.label} className="slot-status-item">
                    <div className="slot-status-copy">
                      <span className={`slot-status-dot ${item.tone}`}></span>
                      <span>{item.label}</span>
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="slot-status-bar">
                <div
                  className="slot-status-segment available"
                  style={{ width: `${(summary.availableSlots / totalStatusSlots) * 100}%` }}
                ></div>
                <div
                  className="slot-status-segment booked"
                  style={{ width: `${(summary.bookedSlots / totalStatusSlots) * 100}%` }}
                ></div>
                <div
                  className="slot-status-segment maintenance"
                  style={{ width: `${(summary.maintenanceSlots / totalStatusSlots) * 100}%` }}
                ></div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
