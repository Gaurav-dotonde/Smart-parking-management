import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getMyBookings } from '../services/bookingService';
import { createSupportTicket } from '../services/supportService';
import { getPaymentAvailability } from '../utils/paymentAvailability';

function StatCard({ tone, label, value, subtext, icon, onClick }) {
  return (
    <button type="button" className={`payments-stat user-clickable-card tone-${tone}`} onClick={onClick} aria-label={`View ${label}`}>
      <div className="payments-stat-icon">{icon}</div>
      <div>
        <span className="payments-stat-label">{label}</span>
        <strong className="payments-stat-value">{value}</strong>
        <span className="payments-stat-subtext">{subtext}</span>
      </div>
      <span className="user-stat-arrow" aria-hidden="true">→</span>
    </button>
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
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState('history');
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ category: 'PAYMENT', subject: '', message: '' });
  const [supportState, setSupportState] = useState({ saving: false, message: '', error: '' });

  const submitSupport = async (event) => {
    event.preventDefault();
    setSupportState({ saving: true, message: '', error: '' });
    try {
      await createSupportTicket(supportForm);
      setSupportState({ saving: false, message: 'Support request submitted. Admin will review it shortly.', error: '' });
      setSupportForm({ category: 'PAYMENT', subject: '', message: '' });
    } catch (err) {
      setSupportState({ saving: false, message: '', error: err.response?.data?.message || `Could not submit request${err.response?.status ? ` (error ${err.response.status})` : ''}. Please try again.` });
    }
  };

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
        const paymentStatus = booking.paymentStatus || (booking.status === 'CANCELLED' ? 'REFUND' : 'PAID');
        const matchesStatus = statusFilter === 'All Status' || paymentStatus === statusFilter;
        const matchesTab = activeTab === 'history' ||
          (activeTab === 'pending' && paymentStatus === 'PENDING') ||
          (activeTab === 'refunds' && ['REFUND', 'REFUNDED'].includes(paymentStatus));
        const matchesLocation = locationFilter === 'All Locations' || booking.lotName === locationFilter;
        const matchesFrom = !from || bookingDate >= from;
        const matchesTo = !to || bookingDate <= to;
        return matchesQuery && matchesStatus && matchesTab && matchesLocation && matchesFrom && matchesTo;
      });
  }, [bookings, searchText, statusFilter, locationFilter, fromDate, toDate, activeTab]);

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
          <h2>Payments &amp; transactions</h2>
          <p>Track every parking payment, check its status, and open the linked booking from one place.</p>
        </div>
      </section>

      <section className="payments-stats-grid">
        <StatCard tone="blue" label="Total Spent" value={loading ? '...' : formatCurrency(stats.totalSpent)} subtext="All transactions" icon="💳" onClick={() => { setActiveTab('history'); resetFilters(); }} />
        <StatCard tone="green" label="Booking Payments" value={loading ? '...' : stats.totalBookings} subtext="Linked bookings" icon="🟢" onClick={() => { setActiveTab('history'); resetFilters(); }} />
        <StatCard tone="amber" label="Active Bookings" value={loading ? '...' : stats.activeBookings} subtext="Currently active" icon="⏰" onClick={() => navigate('/user/bookings?status=ACTIVE')} />
        <StatCard tone="purple" label="Cancelled Bookings" value={loading ? '...' : stats.cancelledBookings} subtext="Booking history" icon="🏷" onClick={() => navigate('/user/booking-history?status=CANCELLED')} />
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

      <section className="payments-main-grid">
        <div className="user-page-card payments-table-card">
          <div className="payments-list-head">
            <div><span className="booking-details-kicker">Transaction records</span><h3>{activeTab === 'history' ? 'Payment History' : activeTab === 'pending' ? 'Pending Payments' : 'Refund History'}</h3></div>
            <span className="payments-result-count">{filteredPayments.length} results</span>
          </div>
          <div className="payments-record-tabs" role="tablist" aria-label="Transaction type">
            <button type="button" role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
              All Transactions <span>{bookings.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'pending'} className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
              Pending <span>{bookings.filter((item) => item.paymentStatus === 'PENDING').length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'refunds'} className={activeTab === 'refunds' ? 'active' : ''} onClick={() => setActiveTab('refunds')}>
              Refunds <span>{bookings.filter((item) => item.status === 'CANCELLED' || ['REFUND', 'REFUNDED'].includes(item.paymentStatus)).length}</span>
            </button>
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
                    <th>Transaction</th>
                    <th>Location</th>
                    <th>Booking Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((booking) => {
                    const paymentAvailability = getPaymentAvailability(booking.startTime);
                    return <tr key={booking.id}>
                      <td>
                        <strong>PAY-{booking.id}</strong>
                        <div className="payments-subline">Booking #{booking.id} · {booking.slotNumber || 'Parking slot'}</div>
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
                      </td>
                      <td>
                        <strong className="payments-amount">{formatCurrency(booking.amount)}</strong>
                        <div className="payments-subline">From booking record</div>
                      </td>
                      <td>
                        <Badge tone={statusTone(booking.paymentStatus || (booking.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'))}>{booking.paymentStatus || (booking.status === 'CANCELLED' ? 'REFUND' : 'PAID')}</Badge>
                      </td>
                      <td>
                        {booking.paymentStatus !== 'PAID' && booking.status !== 'CANCELLED'
                          ? <button type="button" className="btn payments-view-btn" disabled={!paymentAvailability.allowed} title={paymentAvailability.message} onClick={() => navigate('/user/payment-placeholder', { state: { bookingDraft: booking } })}>{paymentAvailability.allowed ? 'Pay' : paymentAvailability.label}</button>
                          : <button type="button" className="btn btn-secondary payments-view-btn" onClick={() => navigate(`/bookings/${booking.id}`)}>View</button>}
                      </td>
                    </tr>;
                  })}
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
            <h3>Quick Summary</h3>
            <div className="payments-method-item">All transactions <span>{bookings.length}</span></div>
            <div className="payments-method-item">Successful <span>{bookings.filter((item) => item.status !== 'CANCELLED').length}</span></div>
            <div className="payments-method-item">Refund records <span>{stats.cancelledBookings}</span></div>
            <div className="payments-method-item is-total">Total paid <span>{formatCurrency(stats.totalSpent)}</span></div>
          </div>

          <div className="user-page-card payments-help-card">
            <strong>Need Help?</strong>
            <p>If you face any payment issue, our support team can assist you.</p>
            <button type="button" className="btn payments-support-btn" onClick={() => setSupportOpen(true)}>
              Contact Support
            </button>
          </div>
        </aside>
      </section>
      {supportOpen && (
        <div className="support-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSupportOpen(false); }}>
          <form className="support-modal" onSubmit={submitSupport}>
            <div className="support-modal-head"><div><span>Help center</span><h3>Contact Support</h3></div><button type="button" onClick={() => setSupportOpen(false)} aria-label="Close">×</button></div>
            <p>Describe your payment issue. The admin team will receive this request in the admin console.</p>
            <label>Issue type<select value={supportForm.category} onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}><option>PAYMENT</option><option>REFUND</option><option>BOOKING</option><option>OTHER</option></select></label>
            <label>Subject<input required maxLength="80" value={supportForm.subject} onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })} placeholder="e.g. Payment deducted but booking not confirmed" /></label>
            <label>Describe the issue<textarea required minLength="10" maxLength="1500" rows="5" value={supportForm.message} onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })} placeholder="Include payment reference, booking ID, and what went wrong..." /></label>
            {supportState.error && <p className="error-text">{supportState.error}</p>}
            {supportState.message && <p className="support-success">{supportState.message}</p>}
            <div className="support-modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setSupportOpen(false)}>Cancel</button><button className="btn" disabled={supportState.saving}>{supportState.saving ? 'Submitting...' : 'Submit request'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
