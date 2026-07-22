import React from 'react';

export default function PaymentSuccess() {
  return (
    <section className="payment-state payment-state-success" role="status">
      <span aria-hidden="true">✓</span>
      <h2>Payment successful</h2>
      <p>Booking confirmation will be shown here after a payment gateway is integrated.</p>
    </section>
  );
}
