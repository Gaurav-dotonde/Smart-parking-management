import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboard } from '../services/adminDashboardService';
import { onParkingDataChanged } from '../services/dataSync';
import { formatDisplayName } from '../utils/formatDisplayName';

const stats = [
  { label: 'Parking Locations', key: 'totalParkingLocations', tone: 'location', icon: '⌂', description: 'Manage parking locations', to: '/admin/lots', trend: 'Live' },
  { label: 'Total Slots', key: 'totalParkingSlots', tone: 'slot', icon: '▦', description: 'View all parking slots', to: '/admin/slots' },
  { label: 'Available Slots', key: 'availableSlots', tone: 'available', icon: '✓', description: 'Ready for new bookings', to: '/admin/slots?status=AVAILABLE' },
  { label: 'Booked Slots', key: 'bookedSlots', tone: 'booked', icon: '▣', description: 'Review booked slot records', to: '/admin/bookings?status=BOOKED' },
  { label: 'Reserved Slots', key: 'reservedSlots', tone: 'reserved', icon: '◇', description: 'Review reserved bookings', to: '/admin/bookings?status=RESERVED' },
  { label: 'Occupied Slots', key: 'occupiedSlots', tone: 'occupied', icon: '●', description: 'View occupied parking slots', to: '/admin/slots?status=OCCUPIED' },
  { label: 'Maintenance', key: 'maintenanceSlots', tone: 'maintenance', icon: '⚒', description: 'Review maintenance slots', to: '/admin/slots?status=MAINTENANCE' },
  { label: 'Disabled', key: 'disabledSlots', tone: 'disabled', icon: '⊘', description: 'View disabled parking slots', to: '/admin/slots?status=DISABLED' },
  { label: 'Users', key: 'totalUsers', tone: 'users', icon: '♙', description: 'Manage registered users', to: '/admin/users' },
  { label: 'Vehicles', key: 'totalVehicles', tone: 'vehicles', icon: '▰', description: 'Manage vehicle records', to: '/admin/vehicles' },
  { label: 'Active Bookings', key: 'activeBookings', tone: 'active', icon: '◷', description: 'View active booking activity', to: '/admin/bookings?status=ACTIVE' },
  { label: 'Completed Bookings', key: 'completedBookings', tone: 'completed', icon: '✓', description: 'Review completed bookings', to: '/admin/bookings?status=COMPLETED' },
  { label: 'Cancelled Bookings', key: 'cancelledBookings', tone: 'cancelled', icon: '×', description: 'Review cancelled bookings', to: '/admin/bookings?status=CANCELLED' },
  { label: "Today's Bookings", key: 'todayBookings', tone: 'today', icon: '◫', description: 'View bookings created today', to: '/admin/bookings?date=today', trend: 'Today' },
  { label: 'Revenue', key: 'totalRevenue', tone: 'revenue', icon: '₹', description: 'Review payment activity', to: '/admin/payments' },
  { label: 'Reports', key: 'totalParkingLocations', tone: 'reports', icon: '▤', description: 'Open operational reports', to: '/admin/reports' },
];

const slotKeys = [
  ['Available', 'availableSlots', '#18a66a'], ['Booked', 'bookedSlots', '#6757d9'],
  ['Reserved', 'reservedSlots', '#e49a21'], ['Occupied', 'occupiedSlots', '#1677e8'],
  ['Maintenance', 'maintenanceSlots', '#7c8798'], ['Disabled', 'disabledSlots', '#e05260'],
];

const bookingKeys = [
  ['Active', 'activeBookings', '#1677e8'], ['Completed', 'completedBookings', '#18a66a'],
  ['Cancelled', 'cancelledBookings', '#e05260'],
];

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const dateTime = (value) => value ? new Date(value).toLocaleString() : 'N/A';
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }) : '';

function Donut({ rows, data, title }) {
  const total = rows.reduce((sum, [, key]) => sum + Number(data[key] || 0), 0);
  let offset = 0;
  const gradient = rows.map(([, key, color]) => {
    const start = offset;
    offset += total ? Number(data[key] || 0) * 100 / total : 0;
    return `${color} ${start}% ${offset}%`;
  }).join(', ');
  return (
    <div className="admin-donut-layout">
      <div className="admin-donut" style={{ background: total ? `conic-gradient(${gradient})` : '#e7edf5' }}>
        <div><strong>{total}</strong><small>{title}</small></div>
      </div>
      <div className="admin-chart-legend">
        {rows.map(([label, key, color]) => <div key={key}><span style={{ background: color }} /><em>{label}</em><strong>{data[key] || 0}</strong></div>)}
      </div>
    </div>
  );
}

function Empty({ text }) { return <div className="admin-empty-compact">{text}</div>; }

const emptyDashboard = {
  totalParkingLocations: 0, totalParkingSlots: 0, availableSlots: 0, bookedSlots: 0,
  reservedSlots: 0, occupiedSlots: 0, maintenanceSlots: 0, disabledSlots: 0,
  totalUsers: 0, totalVehicles: 0, activeBookings: 0, completedBookings: 0,
  cancelledBookings: 0, todayBookings: 0, totalRevenue: 0,
  recentBookings: [], recentUsers: [], recentPayments: [], locationOccupancy: [], revenueOverview: [],
};

const normalizeDashboard = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...emptyDashboard,
    ...source,
    totalParkingLocations: Number(source.totalParkingLocations ?? source.totalLocations ?? 0),
    totalParkingSlots: Number(source.totalParkingSlots ?? source.totalSlots ?? 0),
    recentBookings: Array.isArray(source.recentBookings) ? source.recentBookings : [],
    recentUsers: Array.isArray(source.recentUsers) ? source.recentUsers : [],
    recentPayments: Array.isArray(source.recentPayments) ? source.recentPayments : [],
    locationOccupancy: Array.isArray(source.locationOccupancy) ? source.locationOccupancy : [],
    revenueOverview: Array.isArray(source.revenueOverview) ? source.revenueOverview : [],
  };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminDashboard();
      setData(normalizeDashboard(response?.data));
    } catch (requestError) {
      const diagnostic = {
        status: requestError.response?.status,
        data: requestError.response?.data,
        message: requestError.message,
      };
      if (import.meta.env.DEV) console.error('Admin dashboard request failed', diagnostic);
      setError({
        message: requestError.response?.data?.message || 'Unable to load dashboard data.',
        status: requestError.response?.status,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const unsubscribe = onParkingDataChanged(loadDashboard);
    window.addEventListener('focus', loadDashboard);
    return () => { unsubscribe(); window.removeEventListener('focus', loadDashboard); };
  }, [loadDashboard]);

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.revenueOverview || []).map((point) => Number(point.amount || 0))), [data]);

  if (loading) return <div className="admin-dashboard-page"><div className="admin-loading-card"><span className="admin-spinner" />Loading live dashboard data…</div></div>;
  if (error) return <div className="admin-dashboard-page"><section className="admin-dashboard-error" role="alert"><div className="admin-dashboard-error-icon">!</div><div><h2>Unable to load dashboard data</h2><p>Please check the backend connection and try again.</p>{import.meta.env.DEV && <small>{error.status ? `HTTP ${error.status}: ` : ''}{error.message}</small>}</div><button type="button" className="admin-primary-button" onClick={loadDashboard}>Retry</button></section></div>;

  return (
    <div className="admin-dashboard-page">
      <div className="admin-compact-page-head"><div><h2>Operations overview</h2><p>Live information from the parking database.</p></div><button className="admin-secondary-button" onClick={() => navigate('/admin/reports')}>View reports</button></div>

      <section className="admin-dashboard-stat-grid" aria-label="Dashboard navigation">
        {stats.map(({ label, key, tone, icon, description, to, trend }) => <button type="button" className={`admin-dashboard-stat ${tone}`} key={label} onClick={() => navigate(to)} aria-label={`${label}: ${data[key]}. View details`}>
          <span className="admin-stat-symbol" aria-hidden="true">{icon}</span>
          {trend && <span className="admin-stat-trend">{trend}</span>}
          <span className="admin-stat-content"><small>{label}</small><strong>{key === 'totalRevenue' ? money(data[key]) : data[key]}</strong><em>{description}</em></span>
          <span className="admin-stat-hint">Click to view details <b aria-hidden="true">→</b></span>
        </button>)}
      </section>

      <div className="admin-dashboard-grid two">
        <section className="admin-dashboard-panel"><header><h3>Slot availability</h3><p>Current status across all locations</p></header><Donut rows={slotKeys} data={data} title="slots" /></section>
        <section className="admin-dashboard-panel"><header><h3>Booking status</h3><p>Current booking lifecycle totals</p></header><Donut rows={bookingKeys} data={data} title="bookings" /></section>
      </div>

      <div className="admin-dashboard-grid revenue-quick">
        <section className="admin-dashboard-panel"><header><h3>Revenue overview</h3><p>Paid booking revenue for the last 7 days</p></header>
          <div className="admin-revenue-chart">{(data.revenueOverview || []).map((point) => <div className="admin-revenue-column" key={point.date} title={`${point.date}: ${money(point.amount)}`}><span style={{ height: `${Math.max(5, Number(point.amount || 0) * 100 / maxRevenue)}%` }} /><small>{dateLabel(point.date)}</small></div>)}</div>
        </section>
        <section className="admin-dashboard-panel"><header><h3>Quick actions</h3><p>Common administrator tasks</p></header>
          <div className="admin-quick-actions">
            <button onClick={() => navigate('/admin/lots?action=add')}>+ Add Parking Location</button>
            <button onClick={() => navigate('/admin/slots?action=add')}>+ Add Parking Slot</button>
            <button onClick={() => navigate('/admin/bookings')}>View Bookings</button>
            <button onClick={() => navigate('/admin/users?action=add')}>+ Add User</button>
            <button onClick={() => navigate('/admin/reports')}>Generate Report</button>
          </div>
        </section>
      </div>

      <section className="admin-dashboard-panel admin-wide-table"><header><h3>Recent bookings</h3><p>Latest booking activity</p></header>
        {!data.recentBookings.length ? <Empty text="No bookings have been created yet." /> : <div className="admin-responsive-table"><table><thead><tr><th>ID</th><th>User</th><th>Location / Slot</th><th>Vehicle</th><th>Start</th><th>Status</th></tr></thead><tbody>{data.recentBookings.map((item) => <tr key={item.id}><td>#{item.id}</td><td>{formatDisplayName(item.userName, 'User')}<small>{item.email}</small></td><td>{item.parkingLot}<small>{item.slotNumber}</small></td><td>{item.vehicleNumber || 'N/A'}</td><td>{dateTime(item.startTime)}</td><td><span className={`admin-status ${(item.bookingStatus || 'pending').toLowerCase()}`}>{item.bookingStatus || 'PENDING'}</span></td></tr>)}</tbody></table></div>}
      </section>

      <div className="admin-dashboard-grid three">
        <section className="admin-dashboard-panel"><header><h3>Recently registered users</h3></header>{!data.recentUsers.length ? <Empty text="No registered users." /> : <div className="admin-activity-list">{data.recentUsers.map((item) => <div key={item.id}><span className="admin-mini-avatar">{item.name?.charAt(0) || 'U'}</span><p><strong>{formatDisplayName(item.name, 'User')}</strong><small>{item.email}</small></p><span className={`admin-status ${(item.accountStatus || 'active').toLowerCase()}`}>{item.accountStatus || 'ACTIVE'}</span></div>)}</div>}</section>
        <section className="admin-dashboard-panel"><header><h3>Recent payment activity</h3></header>{!data.recentPayments.length ? <Empty text="No payment activity." /> : <div className="admin-activity-list">{data.recentPayments.map((item) => <div key={item.bookingId}><p><strong>{item.transactionReference}</strong><small>{formatDisplayName(item.userName, 'User')}</small></p><p className="admin-payment-amount"><strong>{money(item.amount)}</strong><span className={`admin-status ${(item.paymentStatus || 'unpaid').toLowerCase()}`}>{item.paymentStatus || 'UNPAID'}</span></p></div>)}</div>}</section>
        <section className="admin-dashboard-panel"><header><h3>Location occupancy</h3></header>{!data.locationOccupancy?.length ? <Empty text="No parking locations." /> : <div className="admin-occupancy-list">{data.locationOccupancy.map((item) => <div key={item.locationId}><p><strong>{item.locationName}</strong><small>{item.unavailableSlots} of {item.totalSlots} unavailable</small></p><div><span style={{ width: `${item.occupancyPercentage}%` }} /></div><em>{item.occupancyPercentage}%</em></div>)}</div>}</section>
      </div>
    </div>
  );
}
