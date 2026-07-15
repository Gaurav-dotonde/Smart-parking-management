import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBookingById } from '../services/bookingService';

function Row({ label, value }) {
  return (
    <div className="booking-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
      .then((res) => {
        if (mounted) setBooking(res.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Failed to load booking details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="user-page-section">
      <section className="user-page-card user-page-shell-card">
        <p className="user-page-eyebrow">Booking Details</p>
        <h2>Booking #{id}</h2>
        <p>Review the booking details stored in the backend.</p>
      </section>

      <section className="user-page-card user-page-shell-card">
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
        {loading && <p>Loading booking details...</p>}
        {error && <p className="error-text">{error}</p>}
        {booking && (
          <div className="booking-detail-grid">
            <Row label="Slot" value={booking.slotNumber} />
            <Row label="Location" value={booking.lotName} />
            <Row label="Status" value={booking.status} />
            <Row label="Payment" value={booking.paymentStatus} />
            <Row label="Vehicle Type" value={booking.vehicleType} />
            <Row label="Vehicle Number" value={booking.vehicleNumber || 'N/A'} />
            <Row label="Amount" value={`₹${booking.amount}`} />
          </div>
        )}
      </section>
    </div>
  );
}
