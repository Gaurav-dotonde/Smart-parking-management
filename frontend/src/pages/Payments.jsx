import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getMyBookings } from '../services/bookingService';
import { getPaymentAvailability } from '../utils/paymentAvailability';
import { getUserRefundById, getUserRefunds } from '../services/refundService';

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

const refundLabels = {
  REQUESTED: 'Refund Requested',
  INITIATED: 'Refund Initiated',
  PROCESSING: 'Refund Processing',
  COMPLETED: 'Refund Completed',
  FAILED: 'Refund Failed',
  REJECTED: 'Refund Rejected',
};

function RefundBadge({ status }) {
  return <span className={`refund-status-badge status-${String(status || '').toLowerCase()}`}>{refundLabels[status] || status}</span>;
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') === 'refunds' ? 'refunds' : 'history');
  const [refundPage, setRefundPage] = useState({ content: [], page: 0, totalElements: 0, totalPages: 0 });
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundDetailsLoading, setRefundDetailsLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab !== 'refunds') return;
    setRefundLoading(true);
    setRefundError('');
    getUserRefunds({ page: refundPage.page, size: 10, status: statusFilter === 'All Status' ? undefined : statusFilter })
      .then((response) => setRefundPage(response.data || { content: [], page: 0, totalElements: 0, totalPages: 0 }))
      .catch((requestError) => setRefundError(requestError.response?.data?.message || 'Unable to load refund records.'))
      .finally(() => setRefundLoading(false));
  }, [activeTab, refundPage.page, statusFilter]);

  const openRefundDetails = async (refundId) => {
    setRefundDetailsLoading(true);
    setRefundError('');
    try {
      const response = await getUserRefundById(refundId);
      setSelectedRefund(response.data);
    } catch (requestError) {
      setRefundError(requestError.response?.data?.message || 'Unable to load refund details.');
    } finally {
      setRefundDetailsLoading(false);
    }
  };

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
        const matchesTab = activeTab === 'history' || (activeTab === 'pending' && paymentStatus === 'PENDING');
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
            <div>
              <span className="booking-details-kicker">Transaction records</span>
              <h3>{activeTab === 'history' ? 'Payment History' : activeTab === 'pending' ? 'Pending Payments' : 'Refund History'}</h3>
            </div>
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
              Refunds <span>{refundPage.totalElements}</span>
            </button>
          </div>

          {activeTab !== 'refunds' && error && <p className="error-text">{error}</p>}
          {activeTab !== 'refunds' && loading && <p>Loading payment records...</p>}

          {activeTab !== 'refunds' && !loading && filteredPayments.length === 0 && (
            <div className="empty-state">
              No payment records available for the selected filters.
            </div>
          )}

          {activeTab !== 'refunds' && !loading && filteredPayments.length > 0 && (
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
                    return (
                      <tr key={booking.id}>
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
                          <Badge tone={statusTone(booking.paymentStatus || (booking.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'))}>
                            {booking.paymentStatus || (booking.status === 'CANCELLED' ? 'REFUND' : 'PAID')}
                          </Badge>
                        </td>
                        <td>
                          {booking.paymentStatus !== 'PAID' && booking.status !== 'CANCELLED'
                            ? (
                              <button
                                type="button"
                                className="btn payments-view-btn"
                                disabled={!paymentAvailability.allowed}
                                title={paymentAvailability.message}
                                onClick={() => navigate('/user/payment-placeholder', { state: { bookingDraft: booking } })}
                              >
                                {paymentAvailability.allowed ? 'Pay' : paymentAvailability.label}
                              </button>
                            )
                            : (
                              <button type="button" className="btn btn-secondary payments-view-btn" onClick={() => navigate(`/bookings/${booking.id}`)}>
                                View
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'refunds' && refundError && <p className="error-text">{refundError}</p>}
          {activeTab === 'refunds' && refundLoading && <div className="refund-loading-state">Loading refund records...</div>}
          {activeTab === 'refunds' && !refundLoading && !refundPage.content?.length && (
            <div className="empty-state">No refunds yet. Cancelled paid bookings and their refund updates will appear here.</div>
          )}
          {activeTab === 'refunds' && !refundLoading && !!refundPage.content?.length && (
            <div className="dashboard-table-wrap user-responsive-table refund-history-table-wrap">
              <table className="dashboard-table refund-history-table">
                <thead><tr><th>Refund ID</th><th>Booking</th><th>Location / Slot</th><th>Original</th><th>Fee</th><th>Refund</th><th>Method</th><th>Status</th><th>Requested</th><th>Processed</th><th>Action</th></tr></thead>
                <tbody>{refundPage.content.map((refund) => <tr key={refund.refundId}>
                  <td><strong>{refund.refundId}</strong><small>Attempt {refund.attemptNumber}</small></td>
                  <td>#{refund.bookingId}</td>
                  <td>{refund.parkingLocation}<small>{refund.slotNumber}</small></td>
                  <td>{formatCurrency(refund.originalPaymentAmount)}</td>
                  <td>{formatCurrency(refund.cancellationFee)}</td>
                  <td><strong>{formatCurrency(refund.refundAmount)}</strong></td>
                  <td>{refund.refundMethod || 'Original method'}</td>
                  <td><RefundBadge status={refund.refundStatus} /></td>
                  <td>{formatDate(refund.requestedAt)}</td>
                  <td>{refund.processedAt ? formatDate(refund.processedAt) : 'Pending'}</td>
                  <td><button type="button" className="btn btn-secondary payments-view-btn" disabled={refundDetailsLoading} onClick={() => openRefundDetails(refund.refundId)}>View</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'refunds' && refundPage.totalPages > 1 && (
            <div className="payments-pagination">
              <button type="button" disabled={refundPage.page === 0} onClick={() => setRefundPage((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
              <span>Page {refundPage.page + 1} of {refundPage.totalPages}</span>
              <button type="button" disabled={refundPage.page + 1 >= refundPage.totalPages} onClick={() => setRefundPage((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
            </div>
          )}

          <div className="payments-footer">
            <span>{activeTab === 'refunds' ? `Showing ${refundPage.content?.length || 0} of ${refundPage.totalElements} refunds` : `Showing ${filteredPayments.length} of ${bookings.length} bookings`}</span>
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
            <button type="button" className="btn payments-support-btn" onClick={() => navigate('/user/support')}>
              Contact Support
            </button>
          </div>
        </aside>
      </section>
      {selectedRefund && (
        <div className="modal-backdrop refund-detail-backdrop" onClick={() => setSelectedRefund(null)}>
          <div className="modal-card refund-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-section-head"><div><h3>Refund Details</h3><p>{selectedRefund.refundId}</p></div><button type="button" className="modal-close" onClick={() => setSelectedRefund(null)}>×</button></div>
            <div className="refund-detail-grid">
              <div><span>Payment ID</span><strong>#{selectedRefund.paymentId}</strong></div>
              <div><span>Booking ID</span><strong>#{selectedRefund.bookingId}</strong></div>
              <div><span>Parking</span><strong>{selectedRefund.parkingLocation} · {selectedRefund.slotNumber}</strong></div>
              <div><span>Cancelled</span><strong>{selectedRefund.bookingCancelledAt ? new Date(selectedRefund.bookingCancelledAt).toLocaleString() : 'N/A'}</strong></div>
              <div><span>Original Payment</span><strong>{formatCurrency(selectedRefund.originalPaymentAmount)}</strong></div>
              <div><span>Cancellation Fee</span><strong>{formatCurrency(selectedRefund.cancellationFee)}</strong></div>
              <div><span>Refund Amount</span><strong>{formatCurrency(selectedRefund.refundAmount)}</strong></div>
              <div><span>Method</span><strong>{selectedRefund.refundMethod}</strong></div>
            </div>
            <div className="refund-current-status"><RefundBadge status={selectedRefund.refundStatus} /><p>{selectedRefund.refundStatus === 'REQUESTED' ? 'Your refund request has been received.' : selectedRefund.refundStatus === 'INITIATED' ? 'Your refund has been initiated.' : selectedRefund.refundStatus === 'PROCESSING' ? 'Your refund is currently being processed.' : selectedRefund.refundStatus === 'COMPLETED' ? 'Your refund was completed successfully.' : selectedRefund.refundStatus === 'FAILED' ? 'The refund could not be completed. Our team will review it.' : 'The refund request was rejected.'}</p>{['PROCESSING', 'COMPLETED'].includes(selectedRefund.refundStatus) && <small>The credited amount may take 5–7 business days to appear, depending on the payment provider.</small>}</div>
            {selectedRefund.failureReason && <div className="refund-safe-error">{selectedRefund.failureReason}</div>}
            <div className="refund-timeline">{selectedRefund.timeline?.map((item) => <div key={`${item.status}-${item.timestamp}`}><i /><span><strong>{refundLabels[item.status] || item.status}</strong><small>{new Date(item.timestamp).toLocaleString()}</small></span></div>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
