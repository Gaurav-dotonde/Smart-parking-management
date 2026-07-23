import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBookingById } from '../services/bookingService';

function DetailIcon({ type }) {
  const paths = {
    slot: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9m0-3h4" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    vehicle: <><path d="m5 17-1 2m15-2 1 2M3 13l2-6h14l2 6v5H3v-5Z" /><circle cx="7" cy="15" r="1" /><circle cx="17" cy="15" r="1" /></>,
    plate: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h10M7 14h6" /></>,
  };
  return <span className="booking-detail-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg></span>;
}

function Row({ label, value, icon }) {
  return (
    <div className="booking-detail-row">
      <DetailIcon type={icon} />
      <div><span>{label}</span><strong>{value || 'N/A'}</strong></div>
    </div>
  );
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'active' || value === 'paid' || value === 'completed') return 'success';
  if (value === 'cancelled' || value === 'failed') return 'danger';
  return 'pending';
}

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getBookingById(id)
      .then((res) => { if (mounted) setBooking(res.data); })
      .catch((err) => { if (mounted) setError(err.response?.data?.message || 'Failed to load booking details.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  return (
    <div className="booking-details-page user-page-section">
      <section className="user-page-card booking-details-hero">
        <button type="button" className="booking-details-back" onClick={() => navigate(-1)}>
          <span aria-hidden="true">←</span> Back to bookings
        </button>
        <div className="booking-details-hero-copy">
          <div className="booking-details-hero-icon" aria-hidden="true">P</div>
          <div>
            <p className="user-page-eyebrow">Reservation overview</p>
            <h2>Booking #{booking?.bookingId || id}</h2>
            <p>Everything you need to know about your parking reservation.</p>
          </div>
        </div>
        {booking && <span className={`booking-details-status tone-${statusTone(booking.status)}`}><i /> {booking.status || 'Unknown'}</span>}
      </section>

      <section className="user-page-card booking-details-card">
        {loading && <div className="booking-details-state"><span className="booking-details-spinner" /><strong>Loading booking details...</strong><p>Please wait while we fetch your reservation.</p></div>}
        {error && <div className="booking-details-state is-error"><strong>We couldn't load this booking</strong><p className="error-text">{error}</p><button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Go back</button></div>}
        {booking && (
          <>
            <div className="booking-details-card-head">
              <div><span className="booking-details-kicker">Parking information</span><h3>Your reserved spot</h3></div>
              <span className="booking-details-id">ID: #{booking.bookingId || id}</span>
            </div>
            <div className="booking-details-content">
              <div className="booking-detail-grid">
                <Row icon="slot" label="Parking Slot" value={booking.slotNumber} />
                <Row icon="location" label="Location" value={booking.lotName} />
                <Row icon="vehicle" label="Vehicle Type" value={booking.vehicleType} />
                <Row icon="plate" label="Vehicle Number" value={booking.vehicleNumber} />
              </div>
              <aside className="booking-details-payment">
                <span className="booking-details-kicker">Payment summary</span>
                <div className="booking-details-amount"><span>Total amount</span><strong>₹{booking.amount ?? 0}</strong></div>
                <div className="booking-details-payment-row">
                  <span>Payment status</span>
                  <strong className={`booking-details-payment-badge tone-${statusTone(booking.paymentStatus)}`}>{booking.paymentStatus || 'Pending'}</strong>
                </div>
                <div className="booking-details-secure"><span aria-hidden="true">✓</span><p><strong>Reservation confirmed</strong>Your parking details are securely saved.</p></div>
              </aside>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
