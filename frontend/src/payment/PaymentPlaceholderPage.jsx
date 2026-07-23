import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { payForBooking } from '../services/paymentService';
import './payment.css';

function formatDateTime(value) {
  if (!value) return 'Not selected';
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PaymentPlaceholderPage({ bookingDraft, onBack, embedded = false, onPaid }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const booking = bookingDraft || state?.bookingDraft;
  const [method, setMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const Container = embedded ? 'section' : 'main';

  const completePayment = async () => {
    if (!booking?.id) { setError('Create the booking before making payment.'); return; }
    setProcessing(true); setError('');
    try {
      await payForBooking(booking.id);
      setPaid(true);
      if (onPaid) onPaid();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment could not be completed.');
    } finally { setProcessing(false); }
  };

  if (paid) return <Container className={`payment-placeholder-page${embedded ? ' is-embedded' : ''}`}><section className="payment-placeholder-card"><div className="payment-paid-icon">✓</div><span className="payment-placeholder-eyebrow">Payment successful</span><h1>Your booking is confirmed!</h1><p>Payment for booking #{booking.id} was completed successfully.</p><button className="btn" onClick={() => navigate('/user/bookings', { replace: true })}>View My Bookings →</button></section></Container>;

  return (
    <Container className={`payment-placeholder-page${embedded ? ' is-embedded' : ''}`}>
      <section className="payment-placeholder-card">
        <span className="payment-placeholder-eyebrow">Secure checkout</span>
        <div className="payment-placeholder-icon" aria-hidden="true">₹</div>
        <h1>Complete your payment</h1>
        <p>Your slot is reserved. Complete payment to confirm the booking.</p>
        <div className="payment-placeholder-amount"><span>Amount to pay</span><strong>₹{Number(booking?.amount || 0).toFixed(2)}</strong></div>
        <div className="payment-placeholder-summary">
          <h2>Booking Summary</h2>
          <div><span>Booking ID</span><strong>{booking?.id ? `#${booking.id}` : 'Pending creation'}</strong></div>
          <div><span>Parking</span><strong>{booking?.lotName || 'Not available'}</strong></div>
          <div><span>Slot</span><strong>{booking?.slotNumber || 'Not selected'}</strong></div>
          <div><span>Vehicle</span><strong>{booking?.vehicleNumber || 'Not provided'}</strong></div>
          <div><span>Visit starts</span><strong>{formatDateTime(booking?.startTime)}</strong></div>
          <div><span>Payment status</span><strong className="payment-pending-text">UNPAID</strong></div>
        </div>
        <div className="payment-methods"><span>Choose payment method</span>{['UPI','CARD','NET BANKING'].map((item) => <button key={item} type="button" className={method === item ? 'active' : ''} onClick={() => setMethod(item)}>{item === 'UPI' ? '▣' : item === 'CARD' ? '▤' : '⌂'} {item}</button>)}</div>
        {error && <p className="payment-placeholder-notice">{error}</p>}
        <div className="payment-placeholder-actions"><button type="button" className="btn btn-secondary" onClick={onBack || (() => navigate(-1))}>← Back</button><button type="button" className="btn" disabled={processing || !booking?.id} onClick={completePayment}>{processing ? 'Processing...' : `Pay ₹${Number(booking?.amount || 0).toFixed(2)}`}</button></div>
        <small>🔒 Secure demo payment · No card details are stored</small>
      </section>
    </Container>
  );
}
