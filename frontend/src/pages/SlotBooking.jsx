import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLotById, getSlots, unwrapList } from '../services/parkingService';
import { bookSlot } from '../services/bookingService';
import { onParkingDataChanged } from '../services/dataSync';

const POLL_INTERVAL_MS = 5000;

export default function SlotBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSlots = useCallback(async () => {
    const res = await getSlots(id);
    setSlots(unwrapList(res.data));
    setSelectedSlot((prev) => {
      if (!prev) return prev;
      const fresh = unwrapList(res.data).find((slot) => slot.id === prev.id);
      if (!fresh || fresh.status !== 'AVAILABLE') {
        setNotice('The slot you selected was just booked by someone else. Please choose another.');
        return null;
      }
      return prev;
    });
  }, [id]);

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

  const hours = () => {
    if (!startTime || !endTime) return 0;
    const diff = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const totalAmount = lot ? hours() * lot.pricePerHour : 0;

  const handleSlotClick = (slot) => {
    if (slot.status !== 'AVAILABLE') return;
    setNotice('');
    setError('');
    setSelectedSlot(slot);
  };

  const handleConfirmBooking = async () => {
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
    if (hours() <= 0) {
      setError('End time must be after start time.');
      return;
    }
    setBooking(true);
    try {
      await bookSlot({
        slotId: selectedSlot.id,
        startTime,
        endTime,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
      });
      navigate('/my-bookings');
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

  return (
    <div className="container">
      {loading && <p style={{ marginTop: 20 }}>Loading slot details...</p>}

      {lot && (
        <>
          <h2 className="page-title">{lot.name}</h2>
          <p className="subtitle">Location: {lot.location} | Rs {lot.pricePerHour}/hour</p>
        </>
      )}

      {!loading && error && !slots.length && <p className="error-text">{error}</p>}

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label>Vehicle Number</label>
          <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="Enter vehicle number" />
        </div>
        <div className="form-group">
          <label>Vehicle Type</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option>Car</option>
            <option>Bike</option>
          </select>
        </div>
        <div className="form-group">
          <label>Start Time</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Time</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      {notice && <p className="error-text">{notice}</p>}

      <div className="slot-legend">
        <span className="legend-item"><span className="legend-box" style={{ background: '#16a34a' }}></span> Available</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#dc2626' }}></span> Booked</span>
        <span className="legend-item"><span className="legend-box" style={{ background: '#eab308' }}></span> Selected</span>
      </div>

      <div className="slot-map">
        {slots.map((slot) => (
          <div key={slot.id} className={slotClass(slot)} onClick={() => handleSlotClick(slot)}>
            {slot.slotNumber}<br />
            <small>Floor {slot.floor}</small>
          </div>
        ))}
      </div>

      {!loading && !error && !slots.length && (
        <div className="empty-state">No slots available for this parking lot.</div>
      )}

      {selectedSlot && (
        <div className="summary-panel">
          <h3>Booking Summary</h3>
          <div className="summary-row"><span>Slot</span><span>{selectedSlot.slotNumber}</span></div>
          <div className="summary-row"><span>Floor</span><span>{selectedSlot.floor}</span></div>
          <div className="summary-row"><span>Duration</span><span>{hours()} hour(s)</span></div>
          <div className="summary-row total"><span>Total Amount</span><span>Rs {totalAmount}</span></div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" style={{ marginTop: 12 }} disabled={booking} onClick={handleConfirmBooking}>
            {booking ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
