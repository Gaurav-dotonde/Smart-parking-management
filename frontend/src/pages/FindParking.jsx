import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findParking, getActiveLots, getSlots, unwrapList } from '../services/parkingService';

const ordinalFloorNames = ['Ground', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'];
const floorName = (floor) => `${ordinalFloorNames[floor] || `Floor ${floor}`} Floor`;

const initialForm = {
  date: '',
  lotId: 'all',
  vehicleType: '',
  floor: '',
};

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function bookingWindow(dateValue) {
  const selectedDate = new Date(`${dateValue}T00:00:00`);
  const now = new Date();
  const start = selectedDate.toDateString() === now.toDateString()
    ? new Date(now.getTime() + 5 * 60 * 1000)
    : selectedDate;
  const end = new Date(`${dateValue}T23:59:00`);
  return {
    start: localDateTime(start),
    end: localDateTime(end),
    startTime: localDateTime(start).slice(11),
    endTime: localDateTime(end).slice(11),
  };
}

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDuration(minutes) {
  const hours = minutes / 60;
  if (hours <= 1) return '1 Hour';
  if (Number.isInteger(hours)) return `${hours} Hours`;
  return `${hours.toFixed(1)} Hours`;
}

function SkeletonCard() {
  return (
    <div className="find-parking-skeleton">
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-40" />
      <div className="skeleton-line w-80" />
      <div className="skeleton-line w-50" />
      <div className="skeleton-line w-70" />
      <div className="skeleton-line w-30" />
    </div>
  );
}

export default function FindParking() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [parkingLots, setParkingLots] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);

  useEffect(() => {
    getActiveLots()
      .then(async (response) => {
        const lots = unwrapList(response.data);
        setParkingLots(lots);
        const slotResponses = await Promise.all(lots.map((lot) => getSlots(lot.id)));
        setParkingSlots(slotResponses.flatMap((slotResponse, index) => unwrapList(slotResponse.data).map((slot) => ({
          ...slot,
          lotId: lots[index].id,
        }))));
      })
      .catch(() => {
        setParkingLots([]);
        setParkingSlots([]);
      });
  }, []);

  const floorOptions = useMemo(() => {
    const counts = new Map();
    parkingSlots
      .filter((slot) => form.lotId && (form.lotId === 'all' || String(slot.lotId) === String(form.lotId)) && slot.status === 'AVAILABLE')
      .forEach((slot) => counts.set(Number(slot.floor), (counts.get(Number(slot.floor)) || 0) + 1));
    return [...counts.entries()]
      .sort(([floorA], [floorB]) => floorA - floorB)
      .map(([floor, count]) => ({ floor, count }));
  }, [form.lotId, parkingSlots]);

  const totalFloorSlots = useMemo(() => floorOptions.reduce((total, option) => total + option.count, 0), [floorOptions]);

  useEffect(() => {
    if (form.floor && form.floor !== 'All Floors' && !floorOptions.some(({ floor }) => String(floor) === String(form.floor))) {
      setForm((current) => ({ ...current, floor: '' }));
    }
  }, [floorOptions, form.floor]);

  const today = useMemo(() => getLocalDateValue(), []);

  const validate = () => {
    if (!form.lotId || !form.date || !form.vehicleType || !form.floor) {
      return 'Please fill all required fields.';
    }

    return '';
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');

    const validationMessage = validate();
    if (validationMessage) {
      setResults([]);
      setHasSearched(true);
      setError(validationMessage);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const { startTime, endTime } = bookingWindow(form.date);
      const res = await findParking({
        date: form.date,
        startTime,
        endTime,
        lotId: form.lotId === 'all' ? undefined : form.lotId,
        vehicleType: 'All',
        floor: form.floor === 'All Floors' ? undefined : form.floor,
      });
      const matchingResults = (res.data || []).filter((slot) => (
        form.lotId === 'all' || String(slot.lotId) === String(form.lotId)
      ));
      setResults(matchingResults);
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || 'Failed to search available slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setResults([]);
    setError('');
    setHasSearched(false);
  };

  const handleBookNow = (slot) => {
    const { start, end } = bookingWindow(form.date);
    const params = new URLSearchParams({
      slotId: String(slot.slotId),
      start,
      end,
      vehicleType: form.vehicleType === 'All' ? (slot.vehicleType || 'Car') : form.vehicleType,
    });
    navigate(`/lots/${slot.lotId}?${params.toString()}`);
  };

  const handleLocationChange = (lotId) => {
    setForm((current) => ({ ...current, lotId, floor: '', vehicleType: '' }));
    setResults([]);
    setError('');
    setHasSearched(false);
  };

  const handleFilterChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setResults([]);
    setError('');
    setHasSearched(false);
  };

  return (
    <div className="find-parking-page user-page-section">
      <section className="user-page-card find-parking-hero">
        <div className="find-parking-hero-copy">
          <p className="find-parking-kicker">Search available parking slots for your visit.</p>
          <p className="find-parking-hero-subtext">Choose date, vehicle type, and floor to see live availability.</p>
        </div>
        <div className="find-parking-hero-chip">
          <span className="find-parking-hero-chip-label">Search Filters</span>
          <span className="find-parking-hero-chip-value">Location, date, type and floor</span>
        </div>
      </section>

      <section className="find-parking-search user-page-card">
        <form className="find-parking-form" onSubmit={handleSearch}>
          <div className="find-parking-form-head">
            <div>
              <h3>Search Parking Slots</h3>
              <p>Choose your visit details to see only available parking options.</p>
            </div>
            <div className="find-parking-form-note">Only available slots will be shown</div>
          </div>

          <div className="find-parking-grid">
            <div className="form-group find-parking-location-filter">
              <label>Parking Location</label>
              <select
                value={form.lotId}
                onChange={(e) => handleLocationChange(e.target.value)}
              >
                <option value="all">All Locations</option>
                {parkingLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} — {lot.area || lot.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Parking Date</label>
              <input
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <select
                value={form.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
              >
                <option value="All">All Vehicle Types</option>
                <option value="Car">Car</option>
                <option value="Two Wheeler">Two Wheeler</option>
              </select>
            </div>
            <div className="form-group">
              <label>Floor</label>
              <select
                value={form.floor}
                disabled={!form.lotId}
                onChange={(e) => handleFilterChange('floor', e.target.value)}
              >
                <option value="" disabled>{form.lotId ? 'Select Floor' : 'Select Location First'}</option>
                {form.lotId && <option value="All Floors">All Floors ({totalFloorSlots} slots)</option>}
                {floorOptions.map(({ floor, count }) => <option key={floor} value={String(floor)}>{floorName(floor)} ({count} slots)</option>)}
              </select>
            </div>
          </div>

          <div className="find-parking-actions">
            <button type="submit" className="btn find-parking-search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button type="button" className="btn btn-secondary find-parking-reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>

          {error && <div className="error-text find-parking-error">{error}</div>}
        </form>
      </section>

      <section className="find-parking-results">
        {loading && (
          <div className="find-parking-results-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="find-parking-empty user-page-card">
            <h3>No parking slots are available for the selected date and time.</h3>
            <p>Try changing the time or choosing a different floor and vehicle type.</p>
            <button type="button" className="btn find-parking-try-btn" onClick={() => setHasSearched(false)}>
              Try Different Time
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="find-parking-results-grid">
            {results.map((slot) => (
              <article key={slot.slotId} className="find-parking-card user-page-card">
                <div className="find-parking-card-head">
                  <div>
                    <span className="find-parking-slot">{slot.slotNumber}</span>
                    <h3>{slot.lotName}</h3>
                    <p>{slot.location} · Floor {slot.floor}</p>
                  </div>
                  <span className="find-parking-badge">Available</span>
                </div>

                <div className="find-parking-meta">
                  <div>
                    <span>Vehicle Type</span>
                    <strong>{form.vehicleType === 'All' ? 'Car / Two Wheeler' : form.vehicleType}</strong>
                  </div>
                  <div>
                    <span>Price per Day</span>
                    <strong>{'\u20B9'}
                      {slot.pricePerDay}
                    </strong>
                  </div>
                  <div>
                    <span>Total Duration</span>
                    <strong>{formatDuration(slot.durationMinutes)}</strong>
                  </div>
                  <div>
                    <span>Estimated Price</span>
                    <strong>{'\u20B9'}
                      {slot.estimatedPrice}
                    </strong>
                  </div>
                </div>

                <button type="button" className="btn find-parking-book-btn" onClick={() => handleBookNow(slot)}>
                  Book Now
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
