import React, { useEffect, useMemo, useState } from 'react';
import { getAdminBookings } from '../services/bookingService';
import { createAdminPayment, getAdminPayments, refundAdminPayment, verifyAdminPayment } from '../services/paymentService';

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
  const [rows, setRows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [form, setForm] = useState(null);
  const [refund, setRefund] = useState(null);
  const [saving, setSaving] = useState(false);

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
        <button className="btn" onClick={() => setForm(blank)}>
          Record Payment
        </button>
      </div>

      <section className="card users-card">
        <div className="users-filters">
          <div className="form-group">
            <label>Search</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>ALL</option>
              {['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card users-card">
        {error && <div className="error-text">{error}</div>}
        {loading ? (
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
