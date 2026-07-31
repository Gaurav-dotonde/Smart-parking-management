import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminBookings } from '../services/bookingService';
import { createAdminPayment, getAdminPayments, refundAdminPayment, verifyAdminPayment } from '../services/paymentService';
import { getAdminRefundById, getAdminRefunds, retryAdminRefund } from '../services/refundService';

const blank = {
  bookingId: '',
  amount: '',
  paymentMethod: 'MANUAL',
  transactionReference: '',
  status: 'PENDING',
};

const msg = (error) => error.response?.data?.message || 'Payment operation failed.';

function getRefundableAmount(payment) {
  return Math.max(0, Number(payment.amount || 0) - Number(payment.refundAmount || 0));
}

export default function AdminPayments() {
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const [tab, setTab] = useState(initialParams.get('tab') === 'refunds' ? 'refunds' : 'payments');
  const [rows, setRows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [form, setForm] = useState(null);
  const [refund, setRefund] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refundRows, setRefundRows] = useState([]);
  const [refundPage, setRefundPage] = useState(0);
  const [refundPages, setRefundPages] = useState(0);
  const [refundStatus, setRefundStatus] = useState(initialParams.get('status') || 'ALL');
  const [refundFrom, setRefundFrom] = useState('');
  const [refundTo, setRefundTo] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [refundDetail, setRefundDetail] = useState(null);
  const [retryReason, setRetryReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [paymentsResponse, bookingsResponse] = await Promise.all([getAdminPayments(), getAdminBookings()]);
      setRows(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);
      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
      setError('');
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadRefunds = async () => {
    setRefundLoading(true);
    try {
      const response = await getAdminRefunds({
        page: refundPage, size: 15,
        status: refundStatus === 'ALL' || refundStatus.includes(',') ? undefined : refundStatus,
        query: search || undefined, from: refundFrom || undefined, to: refundTo || undefined,
        paymentMethod: refundMethod || undefined,
      });
      let content = response.data?.content || [];
      if (refundStatus.includes(',')) {
        const allowed = refundStatus.split(',');
        content = content.filter((item) => allowed.includes(item.refundStatus));
      }
      setRefundRows(content);
      setRefundPages(response.data?.totalPages || 0);
      setError('');
    } catch (err) {
      setError(msg(err));
    } finally {
      setRefundLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'refunds') loadRefunds();
  }, [tab, refundPage, refundStatus, refundFrom, refundTo, refundMethod, search]);

  const openRefundDetail = async (refundId) => {
    try {
      const response = await getAdminRefundById(refundId);
      setRefundDetail(response.data);
      setRetryReason('');
    } catch (err) { setError(msg(err)); }
  };

  const retryRefund = async () => {
    if (!refundDetail || !retryReason.trim()) return;
    setSaving(true);
    try {
      const response = await retryAdminRefund(refundDetail.refundId, retryReason.trim());
      setRefundDetail(response.data);
      setRetryReason('');
      await loadRefunds();
    } catch (err) { setError(msg(err)); }
    finally { setSaving(false); }
  };

  const exportRefunds = () => {
    const headers = ['Refund ID','Booking ID','User','Email','Payment Reference','Original Amount','Cancellation Fee','Refund Amount','Status','Method','Requested At','Processed At'];
    const csv = [headers, ...refundRows.map((item) => [item.refundId,item.bookingId,item.userName,item.userEmail,item.paymentReference,item.originalPaymentAmount,item.cancellationFee,item.refundAmount,item.refundStatus,item.paymentMethod,item.requestedAt,item.processedAt])]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'refund-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const visible = useMemo(
    () =>
      rows
        .filter(
          (payment) =>
            (status === 'ALL' || payment.status === status) &&
            (!search ||
              `${payment.transactionReference} ${payment.bookingId} ${payment.userName} ${payment.vehicleNumber}`
                .toLowerCase()
                .includes(search.toLowerCase()))
        )
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [rows, status, search]
  );

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const left = Number(a.id);
        const right = Number(b.id);
        if (Number.isNaN(left) && Number.isNaN(right)) return 0;
        if (Number.isNaN(left)) return 1;
        if (Number.isNaN(right)) return -1;
        return left - right;
      }),
    [bookings]
  );

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createAdminPayment(form);
      setForm(null);
      await load();
    } catch (err) {
      setError(msg(err));
    } finally {
      setSaving(false);
    }
  };

  const verify = async (payment) => {
    try {
      await verifyAdminPayment(payment.id);
      await load();
    } catch (err) {
      setError(msg(err));
    }
  };

  const openRefund = (payment) => {
    const refundableAmount = getRefundableAmount(payment);
    setRefund({
      ...payment,
      amount: refundableAmount.toFixed(2),
    });
  };

  const doRefund = async () => {
    if (!refund) return;
    setSaving(true);
    try {
      await refundAdminPayment(refund.id, refund.amount);
      setRefund(null);
      await load();
    } catch (err) {
      setError(msg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container admin-page">
      <div className="admin-compact-page-head">
        <div>
          <h2>Payment Management</h2>
          <p>Verify and refund database-backed payment records.</p>
        </div>
        {tab === 'payments' && <button className="btn" onClick={() => setForm(blank)}>
          Record Payment
        </button>}
      </div>

      <div className="payment-page-tabs" role="tablist">
        <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payments</button>
        <button className={tab === 'refunds' ? 'active' : ''} onClick={() => setTab('refunds')}>Refunds</button>
      </div>

      <section className="card users-card">
        <div className="users-filters">
          <div className="form-group">
            <label>Search</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          {tab === 'payments' ? <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>ALL</option>
              {['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div> : <>
            <div className="form-group"><label>Status</label><select value={refundStatus} onChange={(event) => { setRefundPage(0); setRefundStatus(event.target.value); }}><option value="ALL">All</option><option value="REQUESTED">Requested</option><option value="INITIATED">Initiated</option><option value="PROCESSING">Processing</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option><option value="REJECTED">Rejected</option></select></div>
            <div className="form-group"><label>From</label><input type="date" value={refundFrom} onChange={(event) => setRefundFrom(event.target.value)} /></div>
            <div className="form-group"><label>To</label><input type="date" value={refundTo} onChange={(event) => setRefundTo(event.target.value)} /></div>
            <div className="form-group"><label>Payment Method</label><input value={refundMethod} onChange={(event) => setRefundMethod(event.target.value)} placeholder="All methods" /></div>
            <button type="button" className="btn btn-secondary" onClick={exportRefunds} disabled={!refundRows.length}>Export Refund Report</button>
          </>}
        </div>
      </section>

      <section className="card users-card">
        {error && <div className="error-text">{error}</div>}
        {tab === 'refunds' ? (
          refundLoading ? <div className="empty-state">Loading refunds...</div> : !refundRows.length ? <div className="empty-state">No refund records found.</div> : <>
            <div className="dashboard-table-wrap refund-admin-table-wrap"><table className="dashboard-table"><thead><tr><th>Refund ID</th><th>Booking</th><th>User</th><th>Payment</th><th>Original</th><th>Fee</th><th>Refund</th><th>Status</th><th>Method</th><th>Requested</th><th>Processed</th><th>Actions</th></tr></thead>
              <tbody>{refundRows.map((item) => <tr key={item.refundId}><td><strong>{item.refundId}</strong><small>Attempt {item.attemptNumber}</small></td><td>#{item.bookingId}</td><td>{item.userName}<small>{item.userEmail}</small></td><td>{item.paymentReference || `#${item.paymentId}`}</td><td>₹{Number(item.originalPaymentAmount || 0).toFixed(2)}</td><td>₹{Number(item.cancellationFee || 0).toFixed(2)}</td><td><strong>₹{Number(item.refundAmount || 0).toFixed(2)}</strong></td><td><span className={`refund-status-badge ${String(item.refundStatus).toLowerCase()}`}>{item.refundStatus}</span></td><td>{item.paymentMethod || item.refundMethod}</td><td>{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : '—'}</td><td>{item.processedAt ? new Date(item.processedAt).toLocaleString() : '—'}</td><td><button className="btn btn-secondary" onClick={() => openRefundDetail(item.refundId)}>View Details</button></td></tr>)}</tbody>
            </table></div>
            <div className="refund-pagination"><button disabled={refundPage === 0} onClick={() => setRefundPage((value) => value - 1)}>Previous</button><span>Page {refundPage + 1} of {Math.max(refundPages, 1)}</span><button disabled={refundPage + 1 >= refundPages} onClick={() => setRefundPage((value) => value + 1)}>Next</button></div>
          </>
        ) : loading ? (
          <div className="empty-state">Loading payments...</div>
        ) : !visible.length ? (
          <div className="empty-state">No payment records found.</div>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Booking</th>
                  <th>User / Vehicle</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id}</td>
                    <td>#{payment.bookingId}</td>
                    <td>
                      {payment.userName}
                      <small>{payment.vehicleNumber || 'N/A'}</small>
                    </td>
                    <td>₹{Number(payment.amount).toFixed(2)}</td>
                    <td>{payment.paymentMethod}</td>
                    <td>{payment.transactionReference || 'N/A'}</td>
                    <td>
                      <span className={`badge ${payment.status === 'PAID' ? 'badge-active' : 'badge-cancelled'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : 'N/A'}</td>
                    <td>
                      <div className="manage-slots-actions">
                        {['PENDING', 'UNPAID'].includes(payment.status) && (
                          <button className="btn" onClick={() => verify(payment)}>
                            Verify
                          </button>
                        )}
                        {['PAID', 'PARTIALLY_REFUNDED'].includes(payment.status) && (
                          <button className="btn btn-danger" onClick={() => openRefund(payment)}>
                            Refund
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
      </section>

      {refundDetail && (
        <div className="modal-backdrop">
          <div className="modal-card refund-detail-modal">
            <div className="dashboard-section-head"><div><h3>Refund Details</h3><p>{refundDetail.refundId} · Attempt {refundDetail.attemptNumber}</p></div><button className="modal-close" onClick={() => setRefundDetail(null)}>×</button></div>
            <div className="refund-detail-grid">
              <div><span>User</span><strong>{refundDetail.userName}</strong><small>{refundDetail.userEmail}</small></div>
              <div><span>Booking / Payment</span><strong>#{refundDetail.bookingId} / #{refundDetail.paymentId}</strong><small>{refundDetail.paymentReference || 'No reference'}</small></div>
              <div><span>Location / Slot</span><strong>{refundDetail.parkingLocation}</strong><small>{refundDetail.slotNumber}</small></div>
              <div><span>Status</span><strong><span className={`refund-status-badge ${String(refundDetail.refundStatus).toLowerCase()}`}>{refundDetail.refundStatus}</span></strong></div>
              <div><span>Original / Fee</span><strong>₹{Number(refundDetail.originalPaymentAmount || 0).toFixed(2)}</strong><small>Fee ₹{Number(refundDetail.cancellationFee || 0).toFixed(2)}</small></div>
              <div><span>Refund Amount</span><strong>₹{Number(refundDetail.refundAmount || 0).toFixed(2)}</strong><small>{refundDetail.refundMethod || refundDetail.paymentMethod}</small></div>
              {refundDetail.failureReason && <div className="refund-failure-note"><span>Failure reason</span><strong>{refundDetail.failureReason}</strong></div>}
            </div>
            <h4>Status timeline</h4>
            <div className="refund-timeline">{(refundDetail.timeline || []).map((item) => <div key={`${item.status}-${item.timestamp}`}><span /><p><strong>{item.status}</strong><small>{item.message} · {new Date(item.timestamp).toLocaleString()}</small></p></div>)}</div>
            {!!refundDetail.attempts?.length && <><h4>Attempt history</h4><div className="refund-attempt-list">{refundDetail.attempts.map((item) => <div key={item.refundId}><strong>Attempt {item.attemptNumber}</strong><span>{item.refundId}</span><span className={`refund-status-badge ${String(item.status).toLowerCase()}`}>{item.status}</span></div>)}</div></>}
            {refundDetail.refundStatus === 'FAILED' && <div className="refund-retry-box"><label>Retry reason <textarea value={retryReason} onChange={(event) => setRetryReason(event.target.value)} placeholder="Reason is required for the audit history" /></label><button className="btn" disabled={saving || !retryReason.trim()} onClick={retryRefund}>{saving ? 'Retrying...' : 'Retry Refund'}</button></div>}
          </div>
        </div>
      )}

      {form && (
        <div className="modal-backdrop payments-record-backdrop">
          <form className="modal-card payments-record-modal" onSubmit={submit}>
            <div className="dashboard-section-head">
              <h3>Record Payment</h3>
              <button type="button" className="modal-close" onClick={() => setForm(null)}>
                ×
              </button>
            </div>
            <div className="profile-form-grid">
              <div className="form-group">
                <label>Booking</label>
                <select
                  required
                  value={form.bookingId}
                  onChange={(event) => {
                    const selectedBooking = bookings.find((item) => String(item.id) === event.target.value);
                    setForm({
                      ...form,
                      bookingId: event.target.value,
                      amount: selectedBooking?.amount || '',
                    });
                  }}
                >
                  <option value="">Select booking</option>
                  {sortedBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      #{booking.id} - {booking.userName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Method</label>
                <input required value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} />
              </div>
              <div className="form-group">
                <label>Transaction Reference</label>
                <input value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option>PENDING</option>
                  <option>PAID</option>
                  <option>FAILED</option>
                </select>
              </div>
            </div>
            <div className="manage-slots-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {refund && (
        <div className="modal-backdrop payment-refund-backdrop">
          <div className="modal-card confirm-card payment-refund-modal">
            <h3>Record Refund</h3>
            <p>Maximum refundable amount: ₹{getRefundableAmount(refund).toFixed(2)}</p>
            <label>
              <span>Refund Amount</span>
              <input
                type="number"
                min="0.01"
                max={getRefundableAmount(refund).toFixed(2)}
                step="0.01"
                value={refund.amount}
                onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
              />
            </label>
            <div className="manage-slots-actions">
              <button className="btn btn-secondary" disabled={saving} onClick={() => setRefund(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={saving || !refund.amount || Number(refund.amount) <= 0}
                onClick={doRefund}
              >
                {saving ? 'Processing...' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
