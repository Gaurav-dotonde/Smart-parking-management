import React from 'react';

export default function PaymentFailed() {
  return (
    <section className="payment-state payment-state-failed" role="alert">
      <span aria-hidden="true">!</span>
      <h2>Payment unsuccessful</h2>
      <p>Payment failure and retry guidance will be shown here after gateway integration.</p>
    </section>
  );
}
