import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getLotById, getSlots, unwrapList } from '../services/parkingService';
import { bookSlot } from '../services/bookingService';
import { onParkingDataChanged } from '../services/dataSync';
import PaymentPlaceholderPage from '../payment/PaymentPlaceholderPage';
import './SlotBooking.css';

const POLL_INTERVAL_MS = 5000;

function localDateTimeMinimum(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatBookingDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatBookingDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBookingTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function BookingSuccessModal({ booking, lotName, slotNumber, amount, onDownload, onBookings, onDashboard }) {
  if (!booking) return null;
  return (
    <div className="saas-booking-success-backdrop" role="presentation">
      <section className="saas-booking-success" role="dialog" aria-modal="true" aria-labelledby="booking-success-title">
        <div className="saas-booking-success-icon" aria-hidden="true">✓</div>
        <span className="saas-booking-success-eyebrow">Reservation confirmed</span>
        <h2 id="booking-success-title">Your parking slot is secured!</h2>
        <p>A confirmation has been created and your booking is ready.</p>
        <div className="saas-booking-success-details">
          <div><span>Booking ID</span><strong>#{booking.id}</strong></div>
          <div><span>Slot Number</span><strong>{booking.slotNumber || slotNumber}</strong></div>
          <div><span>Parking Name</span><strong>{booking.lotName || lotName}</strong></div>
          <div><span>Amount Paid</span><strong>₹{booking.amount ?? amount}</strong></div>
        </div>
        <button type="button" className="btn saas-booking-success-primary" onClick={onBookings}>Go to My Bookings →</button>
        <div className="saas-booking-success-actions">
          <button type="button" onClick={onDownload}>↓ Download Receipt</button>
          <button type="button" onClick={onDashboard}>Back to Dashboard</button>
        </div>
      </section>
    </div>
  );
}

export default function SlotBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSlotId = Number(searchParams.get('slotId'));
  const presetStartTime = searchParams.get('start') || '';
  const presetEndTime = searchParams.get('end') || '';
  const presetVehicleType = searchParams.get('vehicleType') || 'Car';
  const bookingFromSearch = Number.isFinite(preselectedSlotId) && preselectedSlotId > 0
    && Boolean(presetStartTime) && Boolean(presetEndTime);

  const [lot, setLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [startTime, setStartTime] = useState(presetStartTime);
  const [endTime, setEndTime] = useState(presetEndTime);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState(presetVehicleType);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const loadSlots = useCallback(async () => {
    const res = await getSlots(id);
    setSlots(unwrapList(res.data));
    setSelectedSlot((prev) => {
      const targetSlotId = prev?.id || (Number.isFinite(preselectedSlotId) && preselectedSlotId > 0 ? preselectedSlotId : null);
      if (!targetSlotId) return prev;
      const fresh = unwrapList(res.data).find((slot) => slot.id === targetSlotId);
      if (!fresh || fresh.status !== 'AVAILABLE') {
        setNotice('The slot you selected was just booked by someone else. Please choose another.');
        return null;
      }
      return fresh;
    });
  }, [bookingFromSearch, id, preselectedSlotId]);

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        const [lotRes] = await Promise.all([
          getLotById(id),
          loadSlots(),
        ]);
        if (active) {
          setLot(lotRes.data);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load booking data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPage();
    const unsubscribe = onParkingDataChanged(() => {
      loadSlots();
    });

    const interval = setInterval(async () => {
      try {
        await loadSlots();
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Failed to refresh parking slots.');
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [id, loadSlots]);

  const days = () => {
    if (!startTime || !endTime) return 0;
    const diff = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const totalAmount = lot ? days() * lot.pricePerDay : 0;
  const floors = useMemo(() => [...new Set(slots.map((slot) => Number(slot.floor)))].sort((a, b) => a - b), [slots]);
  const floorSlots = useMemo(() => slots.filter((slot) => Number(slot.floor) === Number(selectedFloor)), [selectedFloor, slots]);
  const availableFloorSlots = floorSlots.filter((slot) => slot.status === 'AVAILABLE').length;
  const minimumStartTime = localDateTimeMinimum(new Date(Date.now() + 60000));
  const durationMinutes = startTime && endTime ? Math.max(0, Math.round((new Date(endTime) - new Date(startTime)) / 60000)) : 0;
  const durationText = durationMinutes > 0
    ? `${Math.floor(durationMinutes / 1440) ? `${Math.floor(durationMinutes / 1440)}d ` : ''}${Math.floor((durationMinutes % 1440) / 60)}h ${durationMinutes % 60}m`
    : '—';
  const timeValidation = startTime && new Date(startTime) < new Date()
    ? 'Start time cannot be in the past.'
    : startTime && endTime && new Date(endTime) <= new Date(startTime)
      ? 'End time must be after start time.'
      : '';

  useEffect(() => {
    if (selectedSlot) {
      setSelectedFloor(Number(selectedSlot.floor));
    } else if (selectedFloor === null && floors.length) {
      setSelectedFloor(floors[0]);
    }
  }, [floors, selectedFloor, selectedSlot]);

  const handleSlotClick = (slot) => {
    if (slot.status !== 'AVAILABLE') return;
    setNotice('');
    setError('');
    setSelectedSlot(slot);
  };

  const goToNextStep = () => {
    setError('');
    if (currentStep === 1) {
      const normalizedVehicleNumber = vehicleNumber.trim().replace(/\s+/g, ' ').toUpperCase();
      if (!normalizedVehicleNumber) return setError('Please enter vehicle number.');
      if (!/^[A-Z0-9- ]{4,20}$/i.test(normalizedVehicleNumber)) return setError('Enter a valid vehicle number using 4-20 letters, numbers, spaces, or hyphens.');
      setVehicleNumber(normalizedVehicleNumber);
    }
    if (currentStep === 2) {
      if (!startTime || !endTime) return setError('Please select arrival and departure time.');
      if (timeValidation || days() <= 0) return setError(timeValidation || 'End time must be after start time.');
    }
    if (currentStep === 3 && !selectedSlot) return setError('Please select an available slot.');
    setCurrentStep((step) => Math.min(step + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousStep = () => {
    setError('');
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = () => {
    setError('');
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    if (booking) return;
    setError('');
    if (!selectedSlot) {
      setError('Please select an available slot.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select start and end time.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setError('Please enter vehicle number.');
      return;
    }
    if (!/^[A-Z0-9- ]{4,20}$/i.test(vehicleNumber.trim())) {
      setError('Enter a valid vehicle number using 4–20 letters, numbers, spaces, or hyphens.');
      return;
    }
    if (new Date(startTime) < new Date()) {
      setError('Start time cannot be in the past.');
      return;
    }
    if (days() <= 0) {
      setError('End time must be after start time.');
      return;
    }
    setBooking(true);
    try {
      const response = await bookSlot({
        slotId: selectedSlot.id,
        startTime,
        endTime,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
      });
      setBookingSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Slot may already be taken.');
      try {
        await loadSlots();
      } catch (refreshErr) {
        setError(refreshErr.response?.data?.message || 'Booking failed and slots could not be refreshed.');
      }
      setSelectedSlot(null);
    } finally {
      setBooking(false);
    }
  };

  const slotClass = (slot) => {
    if (selectedSlot && selectedSlot.id === slot.id) return 'slot slot-selected';
    if (slot.status === 'AVAILABLE') return 'slot slot-available';
    if (slot.status === 'BOOKED' || slot.status === 'RESERVED') return 'slot slot-booked';
    return 'slot slot-disabled';
  };

  const downloadReceipt = () => {
    if (!bookingSuccess) return;
    const receipt = [
      'SMART PARKING — BOOKING RECEIPT',
      `Booking ID: ${bookingSuccess.id}`,
      `Parking: ${bookingSuccess.lotName || lot?.name || '—'}`,
      `Slot: ${bookingSuccess.slotNumber || selectedSlot?.slotNumber || '—'}`,
      `Vehicle: ${bookingSuccess.vehicleNumber || vehicleNumber}`,
      `Start: ${formatBookingDateTime(bookingSuccess.startTime || startTime)}`,
      `End: ${formatBookingDateTime(bookingSuccess.endTime || endTime)}`,
      `Amount Paid: ₹${bookingSuccess.amount ?? totalAmount}`,
      `Status: ${bookingSuccess.status || 'CONFIRMED'}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `parking-booking-${bookingSuccess.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (bookingFromSearch) {
    const durationDays = days();
    const durationLabel = `${durationDays} ${durationDays === 1 ? 'day' : 'days'}`;

    return (
      <main className="booking-checkout-page">
        <div className="booking-checkout-shell">
          {loading && <div className="booking-checkout-status">Preparing your booking...</div>}

          {lot && (
            <section className="booking-checkout-header">
              <div className="booking-checkout-place">
                <div className="booking-place-icon">P</div>
                <div>
                  <span className="booking-checkout-eyebrow">Your selected parking</span>
                <div className="booking-checkout-title-line">
                  <h1>{lot.name}</h1>
                  <span className={`booking-checkout-badge ${selectedSlot ? '' : 'is-checking'}`}>
                    {selectedSlot ? 'Available' : 'Checking'}
                  </span>
                </div>
                  <p><span className="booking-location-pin">●</span> {lot.location}</p>
                </div>
              </div>
              <div className="booking-checkout-rate">
                <span>Rate</span>
                <strong>Rs {lot.pricePerDay}</strong>
                <small>/ day</small>
              </div>
            </section>
          )}

          {lot && (
            <div className="booking-progress" aria-label="Booking progress">
              <div className="is-complete"><span>✓</span><div><strong>Search</strong><small>Slot selected</small></div></div>
              <i />
              <div className="is-active"><span>2</span><div><strong>Details</strong><small>Vehicle information</small></div></div>
              <i />
              <div><span>3</span><div><strong>Confirmation</strong><small>Instant booking</small></div></div>
            </div>
          )}

          {notice && <div className="booking-checkout-alert">{notice}</div>}
          {!loading && error && !selectedSlot && <div className="booking-checkout-alert">{error}</div>}

          {selectedSlot ? (
            <div className="booking-checkout-grid">
              <section className="booking-checkout-card booking-vehicle-card">
                <div className="booking-section-title">
                  <span className="booking-section-icon">▣</span>
                  <div><h2>Vehicle Details</h2><p>Enter the vehicle you’re arriving with</p></div>
                </div>
                <div className="booking-checkout-divider" />

                <label className="booking-checkout-field">
                  <span>Vehicle Number</span>
                  <input
                    type="text"
                    name="bookingVehicleNumber"
                    value={vehicleNumber}
                    onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())}
                    autoComplete="off"
                    autoFocus
                  />
                </label>

                <label className="booking-checkout-field">
                  <span>Vehicle Type</span>
                  <input type="text" value={vehicleType} disabled />
                </label>

                <div className="booking-duration-card">
                  <div className="booking-duration-head">
                    <strong>Selected Duration</strong>
                    <span>Locked from search</span>
                  </div>
                  <div className="booking-duration-grid">
                    <div>
                      <span>Start Time</span>
                      <strong>{formatBookingDate(startTime)}</strong>
                      <b>{formatBookingTime(startTime)}</b>
                    </div>
                    <div>
                      <span>End Time</span>
                      <strong>{formatBookingDate(endTime)}</strong>
                      <b>{formatBookingTime(endTime)}</b>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="booking-checkout-card booking-summary-card">
                <div className="booking-section-title">
                  <span className="booking-section-icon booking-summary-icon">✓</span>
                  <div><h2>Booking Summary</h2><p>Review before confirming</p></div>
                </div>
                <div className="booking-checkout-divider" />
                <div className="booking-summary-details">
                  <div><span>Slot</span><strong className="booking-slot-pill">{selectedSlot.slotNumber}</strong></div>
                  <div><span>Floor</span><strong>{selectedSlot.floor} {selectedSlot.floor === 0 ? '(Ground)' : ''}</strong></div>
                  <div><span>Duration</span><strong>{durationLabel}</strong></div>
                </div>
                <div className="booking-total-row">
                  <span>Total Amount</span>
                  <div><strong>Rs {totalAmount}</strong><small>Incl. all taxes</small></div>
                </div>
                {error && <p className="error-text booking-checkout-inline-error">{error}</p>}
                <button className="btn booking-confirm-button" disabled={booking} onClick={handleConfirmBooking}>
                  {booking ? 'Booking...' : 'Confirm Booking →'}
                </button>
                <div className="booking-guarantee"><span>✓</span><div><strong>Instant reservation</strong><small>Your slot is secured immediately</small></div></div>
              </aside>
            </div>
          ) : !loading && (
            <section className="booking-checkout-card booking-unavailable-card">
              <h2>This slot is no longer available</h2>
              <p>Please return to the search results and choose another available slot.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/user/find-parking')}>
                Back to Find Parking
              </button>
            </section>
          )}
          <BookingSuccessModal
            booking={bookingSuccess}
            lotName={lot?.name}
            slotNumber={selectedSlot?.slotNumber}
            amount={totalAmount}
            onDownload={downloadReceipt}
            onBookings={() => navigate('/user/bookings', { replace: true, state: { bookingConfirmed: true, booking: bookingSuccess } })}
            onDashboard={() => navigate('/user/dashboard', { replace: true })}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="direct-booking-page">
      <div className="direct-booking-shell">
        <button type="button" className="direct-booking-back" onClick={() => navigate('/user/available-slots')}>← Back to Available Slots</button>

        {loading && <div className="direct-booking-loading">Loading current slot availability…</div>}

        {!loading && lot && (
          <>
            <div className="direct-booking-container">
            <header className="direct-booking-header">
              <div className="direct-booking-place-icon">P</div>
              <div className="direct-booking-heading">
                <span>Complete your reservation</span>
                <h1>{lot.name}</h1>
                <p>{lot.location} · {slots.filter((slot) => slot.status === 'AVAILABLE').length} slots available now</p>
                <div className="direct-booking-facility-meta">
                  <span aria-label="Rated 4 out of 5 stars">★★★★<i>★</i> <b>4.0</b></span>
                  <span>◷ {lot.openingTime && lot.closingTime ? `${lot.openingTime}–${lot.closingTime}` : 'Open 24 hours'}</span>
                  <span>◆ Car &amp; Two Wheeler</span>
                </div>
              </div>
              <div className="direct-booking-rate"><span>Daily rate</span><strong>₹{lot.pricePerDay}</strong><small>per day</small></div>
            </header>

            {notice && <div className="direct-booking-notice">{notice}</div>}
            {error && !slots.length && <div className="direct-booking-error">{error}</div>}

            <nav className="direct-booking-steps" aria-label="Booking progress">
              <div className={currentStep > 1 ? 'is-complete' : currentStep === 1 ? 'is-active' : ''}><span>{currentStep > 1 ? '✓' : '1'}</span><div><strong>Vehicle Details</strong><small>Registration and type</small></div></div>
              <i />
              <div className={currentStep > 2 ? 'is-complete' : currentStep === 2 ? 'is-active' : ''}><span>{currentStep > 2 ? '✓' : '2'}</span><div><strong>Visit Time</strong><small>Arrival and departure</small></div></div>
              <i />
              <div className={currentStep > 3 ? 'is-complete' : currentStep === 3 ? 'is-active' : ''}><span>{currentStep > 3 ? '✓' : '3'}</span><div><strong>Choose Slot</strong><small>Floor and parking bay</small></div></div>
              <i />
              <div className={currentStep > 4 ? 'is-complete' : currentStep === 4 ? 'is-active' : ''}><span>{currentStep > 4 ? '✓' : '4'}</span><div><strong>Review</strong><small>Check booking details</small></div></div>
              <i />
              <div className={currentStep === 5 ? 'is-active' : ''}><span>5</span><div><strong>Payment</strong><small>Future integration</small></div></div>
            </nav>

            <div className="direct-booking-wizard">
              <div className="direct-booking-primary">
                {(currentStep === 1 || currentStep === 2) && <section className="direct-booking-card">
                  <div className="direct-booking-section-head">
                    <div><span className="direct-booking-step">{currentStep}</span><div><h2>{currentStep === 1 ? 'Vehicle Details' : 'Visit Time'}</h2><p>{currentStep === 1 ? 'Tell us which vehicle you will bring.' : 'Select your arrival and departure date and time.'}</p></div></div>
                    <span className="direct-booking-required">All fields required</span>
                  </div>

                  <div className="direct-booking-form-grid">
                    {currentStep === 1 && <>
                    <label><span>▣ Vehicle Number</span><input aria-label="Vehicle number" type="text" value={vehicleNumber} maxLength={20} onChange={(event) => { setVehicleNumber(event.target.value.toUpperCase()); setError(''); }} placeholder="e.g. MH 12 AB 1234" autoComplete="off" /></label>
                    <label><span>◇ Vehicle Type</span><select aria-label="Vehicle type" value={vehicleType} onChange={(event) => { setVehicleType(event.target.value); setError(''); }}><option value="Car">Car</option><option value="Two Wheeler">Two Wheeler</option></select></label>
                    </>}
                    {currentStep === 2 && <>
                    <label><span>◷ Start Date &amp; Time</span><input aria-label="Start date and time" type="datetime-local" min={minimumStartTime} value={startTime} onChange={(event) => { setStartTime(event.target.value); if (endTime && event.target.value >= endTime) setEndTime(''); setError(''); }} /></label>
                    <label><span>◷ End Date &amp; Time</span><input aria-label="End date and time" type="datetime-local" min={startTime || minimumStartTime} value={endTime} onChange={(event) => { setEndTime(event.target.value); setError(''); }} /></label>
                    </>}
                  </div>
                  {currentStep === 2 &&
                  <div className={`direct-booking-time-insight${timeValidation ? ' has-error' : ''}`}>
                    <div><span>Estimated Duration</span><strong>{durationText}</strong></div>
                    <div><span>Live Estimated Price</span><strong>₹{totalAmount}</strong></div>
                    {timeValidation && <p role="alert">{timeValidation}</p>}
                  </div>
                  }
                  {error && <div className="direct-booking-inline-error direct-booking-step-error" role="alert">{error}</div>}
                  <div className="direct-booking-wizard-actions">
                    {currentStep > 1 && <button type="button" className="btn btn-secondary" onClick={goToPreviousStep}>← Back</button>}
                    <button type="button" className="btn direct-booking-next" onClick={goToNextStep}>{currentStep === 1 ? 'Next: Visit Time' : 'Next: Choose Slot'} →</button>
                  </div>
                </section>}

                {currentStep === 3 && <section className="direct-booking-card">
                  <div className="direct-booking-section-head">
                    <div><span className="direct-booking-step">3</span><div><h2>Choose Your Slot</h2><p>Select a floor and an available parking slot.</p></div></div>
                    <span className="direct-booking-live"><i />Live updates</span>
                  </div>

                  <div className="direct-booking-floor-tabs" role="tablist" aria-label="Parking floors">
                    {floors.map((floor) => {
                      const floorAvailable = slots.filter((slot) => Number(slot.floor) === floor && slot.status === 'AVAILABLE').length;
                      return <button key={floor} type="button" role="tab" aria-selected={Number(selectedFloor) === floor} className={Number(selectedFloor) === floor ? 'is-active' : ''} onClick={() => setSelectedFloor(floor)}>Floor {floor}<small>{floorAvailable} available</small></button>;
                    })}
                  </div>

                  <div className="direct-booking-slot-meta">
                    <strong>Floor {selectedFloor}</strong>
                    <span>{availableFloorSlots} of {floorSlots.length} slots available</span>
                    <div><span><i className="available" />Available</span><span><i className="booked" />Unavailable</span><span><i className="selected" />Selected</span></div>
                  </div>

                  <div className="direct-booking-slot-grid">
                    {floorSlots.map((slot) => {
                      const selected = selectedSlot?.id === slot.id;
                      const available = slot.status === 'AVAILABLE';
                      return (
                        <button key={slot.id} type="button" className={`${available ? 'is-available' : 'is-unavailable'}${selected ? ' is-selected' : ''}`} disabled={!available} onClick={() => handleSlotClick(slot)} aria-pressed={selected} aria-label={`${slot.slotNumber}, ${selected ? 'selected' : available ? 'available' : 'unavailable'}`}>
                          <strong>{slot.slotNumber}</strong><small>{selected ? 'Selected' : available ? 'Available' : slot.status}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="direct-booking-slot-selection" aria-live="polite">
                    <div><span>Selected Slot</span><strong>{selectedSlot?.slotNumber || 'None'}</strong></div>
                    <div><span>Floor</span><strong>{selectedSlot ? `Floor ${selectedSlot.floor}` : '—'}</strong></div>
                  </div>
                  {error && <div className="direct-booking-inline-error direct-booking-step-error" role="alert">{error}</div>}
                  <div className="direct-booking-wizard-actions"><button type="button" className="btn btn-secondary" onClick={goToPreviousStep}>← Back</button><button type="button" className="btn direct-booking-next" onClick={goToNextStep}>Next: Review Booking →</button></div>
                </section>}
              </div>

              {currentStep === 4 && <aside className="direct-booking-summary">
                <div className="direct-booking-summary-head"><span>Booking Summary</span><small>Review before confirming</small></div>
                <div className="direct-booking-selected-slot">
                  <span>Selected Slot</span>
                  <strong>{selectedSlot?.slotNumber || 'Not selected'}</strong>
                  <small>{selectedSlot ? `Floor ${selectedSlot.floor}` : 'Choose a green slot'}</small>
                </div>
                <div className="direct-booking-summary-rows">
                  <div><span>Location</span><strong>{lot.name}</strong></div>
                  <div><span>Vehicle</span><strong>{vehicleType}</strong></div>
                  <div><span>Start</span><strong>{formatBookingDateTime(startTime)}</strong></div>
                  <div><span>End</span><strong>{formatBookingDateTime(endTime)}</strong></div>
                  <div><span>Duration</span><strong>{days() ? `${days()} ${days() === 1 ? 'day' : 'days'}` : '—'}</strong></div>
                  <div><span>Price / Day</span><strong>₹{lot.pricePerDay}</strong></div>
                </div>
                <div className="direct-booking-total"><span>Total Amount<small>Calculated by daily rate</small></span><strong>₹{totalAmount}</strong></div>
                {error && <div className="direct-booking-inline-error" role="alert">{error}</div>}
                <div className="direct-booking-wizard-actions"><button type="button" className="btn btn-secondary" onClick={goToPreviousStep}>← Back</button><button type="button" className="btn direct-booking-confirm" disabled={loading} onClick={handleProceedToPayment}>Proceed to Payment →</button></div>
                <div className="direct-booking-security"><span>✓</span><div><strong>Secure instant booking</strong><small>Availability is verified again before confirmation.</small></div></div>
              </aside>}
              {currentStep === 5 && <PaymentPlaceholderPage
                bookingDraft={{
                  lotId: lot?.id,
                  lotName: lot?.name,
                  slotId: selectedSlot?.id,
                  slotNumber: selectedSlot?.slotNumber,
                  floor: selectedSlot?.floor,
                  vehicleNumber,
                  vehicleType,
                  startTime,
                  endTime,
                  amount: totalAmount,
                }}
                onBack={goToPreviousStep}
                embedded
              />}
            </div>
            </div>
          </>
        )}

        {!loading && !lot && <div className="direct-booking-error">{error || 'Parking location could not be loaded.'}</div>}
        <BookingSuccessModal
          booking={bookingSuccess}
          lotName={lot?.name}
          slotNumber={selectedSlot?.slotNumber}
          amount={totalAmount}
          onDownload={downloadReceipt}
          onBookings={() => navigate('/user/bookings', { replace: true, state: { bookingConfirmed: true, booking: bookingSuccess } })}
          onDashboard={() => navigate('/user/dashboard', { replace: true })}
        />
      </div>
    </main>
  );
}
