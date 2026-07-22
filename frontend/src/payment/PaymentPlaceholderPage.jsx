import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isPaymentGatewayAvailable } from './paymentService';
import './payment.css';

function formatDateTime(value) {
  if (!value) return 'Not selected';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentPlaceholderPage({ bookingDraft, onBack, embedded = false }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const booking = bookingDraft || state?.bookingDraft;
  const gatewayAvailable = isPaymentGatewayAvailable();
  const Container = embedded ? 'section' : 'main';

  return (
    <Container className={`payment-placeholder-page${embedded ? ' is-embedded' : ''}`}>
      <section className="payment-placeholder-card">
        <span className="payment-placeholder-eyebrow">Payment Module</span>
        <div className="payment-placeholder-icon" aria-hidden="true">₹</div>
        <h1>Future Payment Gateway</h1>
        <p>This screen is reserved for future payment gateway integration.</p>

        <div className="payment-placeholder-amount">
          <span>Booking Amount</span>
          <strong>₹{Number(booking?.amount || 0).toFixed(2)}</strong>
        </div>

        <div className="payment-placeholder-summary">
          <h2>Booking Summary</h2>
          <div><span>Booking ID</span><strong>Not created yet</strong></div>
          <div><span>Parking</span><strong>{booking?.lotName || 'Not available'}</strong></div>
          <div><span>Slot</span><strong>{booking?.slotNumber || 'Not selected'}</strong></div>
          <div><span>Floor</span><strong>{booking?.floor ?? 'Not selected'}</strong></div>
          <div><span>Vehicle</span><strong>{booking?.vehicleNumber || 'Not provided'} · {booking?.vehicleType || 'Not provided'}</strong></div>
          <div><span>Visit</span><strong>{formatDateTime(booking?.startTime)} – {formatDateTime(booking?.endTime)}</strong></div>
        </div>

        {!booking && <p className="payment-placeholder-notice" role="alert">Booking information is unavailable. Return to slot selection to prepare a booking.</p>}

        <div className="payment-placeholder-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack || (() => navigate(-1))}>← Back to Review</button>
          <button type="button" className="btn" disabled={!gatewayAvailable}>Coming Soon</button>
        </div>

        <small>No booking or payment has been created from this placeholder.</small>
      </section>
    </Container>
  );
}

// TODO: Future Razorpay Integration
// TODO: Payment Verification
// TODO: Payment Callback
