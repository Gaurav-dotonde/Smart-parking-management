import React, { useEffect, useMemo, useState } from 'react';
import {
  getReportsBookingStatus,
  getReportsBookings,
  getReportsRevenue,
  getReportsSummary,
  getReportsTopSlots,
} from '../services/reportsService';
import { onParkingDataChanged } from '../services/dataSync';
import { unwrapList } from '../services/parkingService';
import { formatDisplayName } from '../utils/formatDisplayName';

const todayString = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'N/A';

const buildCsv = (rows) => {
  const header = ['Booking ID', 'User Name', 'Slot Number', 'Vehicle Number', 'Booking Date', 'Duration', 'Booking Status', 'Payment Status', 'Amount'];
  const body = rows.map((row) => [
    row.bookingId,
    row.userName,
    row.slotNumber,
    row.vehicleNumber,
    formatDateTime(row.bookingDate),
    `${row.durationHours} hour(s)`,
    row.bookingStatus,
    row.paymentStatus,
    row.amount,
  ]);

  return [header, ...body]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

export default function AdminReports() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedRange, setAppliedRange] = useState({ fromDate: '', toDate: '' });
  const [summary, setSummary] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [topSlots, setTopSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async (range = appliedRange) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (range.fromDate) params.fromDate = range.fromDate;
      if (range.toDate) params.toDate = range.toDate;

      const [summaryRes, statusRes, revenueRes, topSlotsRes, bookingsRes] = await Promise.all([
        getReportsSummary(params),
        getReportsBookingStatus(params),
        getReportsRevenue(params),
        getReportsTopSlots(params),
        getReportsBookings(params),
      ]);

      setSummary(summaryRes.data);
      setStatusData(statusRes.data);
      setRevenue(revenueRes.data);
      setTopSlots(unwrapList(topSlotsRes.data));
      setBookings(unwrapList(bookingsRes.data).sort((a, b) => Number(a.bookingId) - Number(b.bookingId)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports({ fromDate: '', toDate: '' });
    return onParkingDataChanged(() => {
      loadReports(appliedRange);
    });
  }, [appliedRange]);

  const applyFilter = () => {
    const range = { fromDate, toDate };
    setAppliedRange(range);
    loadReports(range);
  };

  const resetFilter = () => {
    const range = { fromDate: '', toDate: '' };
    setFromDate('');
    setToDate('');
    setAppliedRange(range);
    loadReports(range);
  };

  const statusSegments = useMemo(() => {
    if (!statusData) return [];
    const total = statusData.activeBookings + statusData.completedBookings + statusData.cancelledBookings || 1;
    return [
      { label: 'Active Bookings', value: statusData.activeBookings, color: '#16a34a', ratio: (statusData.activeBookings / total) * 100 },
      { label: 'Completed Bookings', value: statusData.completedBookings, color: '#4f46e5', ratio: (statusData.completedBookings / total) * 100 },
      { label: 'Cancelled Bookings', value: statusData.cancelledBookings, color: '#dc2626', ratio: (statusData.cancelledBookings / total) * 100 },
    ];
  }, [statusData]);

  const doughnutStyle = useMemo(() => {
    const [active, completed, cancelled] = statusSegments;
    if (!active || !completed || !cancelled) {
      return { background: '#e5e7eb' };
    }
    const a = active.ratio;
    const c = completed.ratio;
    return {
      background: `conic-gradient(${active.color} 0 ${a}%, ${completed.color} ${a}% ${a + c}%, ${cancelled.color} ${a + c}% 100%)`,
    };
  }, [statusSegments]);

  const maxRevenue = Math.max(revenue?.dailyRevenue || 0, revenue?.weeklyRevenue || 0, revenue?.monthlyRevenue || 0, 1);

  const exportCsv = () => {
    const csv = buildCsv(bookings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const from = appliedRange.fromDate || 'all';
    const to = appliedRange.toDate || 'all';
    link.href = url;
    link.download = `parking-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container admin-page">
      <div className="manage-slots-head">
        <div>
          <h2 className="page-title">Reports &amp; Analytics</h2>
          <p className="subtitle">Live report insights based on actual parking bookings and revenue.</p>
        </div>
        <button type="button" className="btn" onClick={exportCsv} disabled={!bookings.length}>
          Export Report
        </button>
      </div>

      <section className="card reports-card reports-filter-card">
        <div className="reports-filter-grid">
          <div className="form-group">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="reports-filter-actions">
            <button type="button" className="btn" onClick={applyFilter}>Apply Filter</button>
            <button type="button" className="btn btn-secondary" onClick={resetFilter}>Reset</button>
          </div>
        </div>
      </section>

      {loading && <div className="card empty-state">Loading reports...</div>}
      {!loading && error && <div className="card error-text">{error}</div>}
      {!loading && !error && !summary && <div className="card empty-state">No report data found.</div>}

      {!loading && !error && summary && (
        <>
          <div className="dashboard-stats-grid bookings-stats-grid">
            <div className="card dashboard-stat-card"><div className="dashboard-stat-icon admin-report-stat-icon blue"><ReportStatIcon type="total" /></div><div><span className="dashboard-stat-title">Total Bookings</span><strong className="dashboard-stat-value">{summary.totalBookings}</strong></div></div>
            <div className="card dashboard-stat-card"><div className="dashboard-stat-icon admin-report-stat-icon purple"><ReportStatIcon type="completed" /></div><div><span className="dashboard-stat-title">Completed Bookings</span><strong className="dashboard-stat-value">{summary.completedBookings}</strong></div></div>
            <div className="card dashboard-stat-card"><div className="dashboard-stat-icon admin-report-stat-icon red"><ReportStatIcon type="cancelled" /></div><div><span className="dashboard-stat-title">Cancelled Bookings</span><strong className="dashboard-stat-value">{summary.cancelledBookings}</strong></div></div>
            <div className="card dashboard-stat-card"><div className="dashboard-stat-icon admin-report-stat-icon green"><ReportStatIcon type="revenue" /></div><div><span className="dashboard-stat-title">Total Revenue</span><strong className="dashboard-stat-value reports-money">{formatCurrency(summary.totalRevenue)}</strong></div></div>
            <div className="card dashboard-stat-card"><div className="dashboard-stat-icon admin-report-stat-icon amber"><ReportStatIcon type="average" /></div><div><span className="dashboard-stat-title">Average Booking Amount</span><strong className="dashboard-stat-value reports-money">{formatCurrency(summary.averageBookingAmount)}</strong></div></div>
          </div>

          <div className="dashboard-sections-grid reports-sections-grid">
            <section className="card dashboard-section">
              <div className="dashboard-section-head">
                <h3>Booking Status Overview</h3>
                <p>Read-only status distribution for the selected range.</p>
              </div>
              <div className="reports-status-layout">
                <div className="reports-doughnut" style={doughnutStyle}>
                  <div className="reports-doughnut-hole"></div>
                </div>
                <div className="slot-status-list">
                  {statusSegments.map((item) => (
                    <div key={item.label} className="slot-status-item">
                      <div className="slot-status-copy">
                        <span className="slot-status-dot" style={{ background: item.color }}></span>
                        <span>{item.label}</span>
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="card dashboard-section">
              <div className="dashboard-section-head">
                <h3>Revenue Overview</h3>
                <p>Revenue includes only PAID valid bookings.</p>
              </div>
              <div className="reports-revenue-bars">
                {[
                  { label: 'Daily Revenue', value: revenue?.dailyRevenue || 0, color: '#2563eb' },
                  { label: 'Weekly Revenue', value: revenue?.weeklyRevenue || 0, color: '#16a34a' },
                  { label: 'Monthly Revenue', value: revenue?.monthlyRevenue || 0, color: '#9333ea' },
                ].map((item) => (
                  <div key={item.label} className="reports-revenue-item">
                    <div className="reports-revenue-meta">
                      <span>{item.label}</span>
                      <strong>{formatCurrency(item.value)}</strong>
                    </div>
                    <div className="reports-revenue-track">
                      <div className="reports-revenue-fill" style={{ width: `${(item.value / maxRevenue) * 100}%`, background: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card reports-card">
            <div className="dashboard-section-head">
              <h3>Most Used Parking Slots</h3>
              <p>Top 5 slots sorted by booking frequency.</p>
            </div>
            {!topSlots.length ? <div className="empty-state">No slot usage data found.</div> : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Slot Number</th>
                      <th>Floor</th>
                      <th>Vehicle Type</th>
                      <th>Total Bookings</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSlots.map((slot) => (
                      <tr key={`${slot.rank}-${slot.slotNumber}`}>
                        <td>{slot.rank}</td>
                        <td>{slot.slotNumber}</td>
                        <td>{slot.floor}</td>
                        <td>{slot.vehicleType}</td>
                        <td>{slot.totalBookings}</td>
                        <td>{formatCurrency(slot.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card reports-card">
            <div className="dashboard-section-head">
              <h3>Recent Report Data</h3>
              <p>Detailed booking report for the selected date range.</p>
            </div>
            {!bookings.length ? <div className="empty-state">No booking records found for this report range.</div> : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>User Name</th>
                      <th>Slot Number</th>
                      <th>Vehicle Number</th>
                      <th>Booking Date</th>
                      <th>Duration</th>
                      <th>Booking Status</th>
                      <th>Payment Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.bookingId}>
                        <td>{booking.bookingId}</td>
                        <td>{formatDisplayName(booking.userName, 'User')}</td>
                        <td>{booking.slotNumber}</td>
                        <td>{booking.vehicleNumber}</td>
                        <td>{formatDateTime(booking.bookingDate)}</td>
                        <td>{booking.durationHours} hour(s)</td>
                        <td>{booking.bookingStatus}</td>
                        <td>{booking.paymentStatus}</td>
                        <td>{formatCurrency(booking.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function ReportStatIcon({ type }) {
  const icons = {
    total: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /></>,
    completed: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" /></>,
    cancelled: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    revenue: <><circle cx="12" cy="12" r="9" /><path d="M15.5 7.5h-7M13 7.5c0 5-4 5-4 5h4.5M9 12.5l6 5" /></>,
    average: <><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" /><path d="M3 21h18" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[type]}</svg>;
}
