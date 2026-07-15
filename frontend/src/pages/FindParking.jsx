import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findParking } from '../services/parkingService';

const initialForm = {
  date: '',
  startTime: '',
  endTime: '',
  vehicleType: 'Four Wheeler',
  floor: 'All Floors',
};

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

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMinTime = useMemo(() => {
    if (form.date !== today) return '';
    return new Date().toTimeString().slice(0, 5);
  }, [form.date, today]);

  const validate = () => {
    if (!form.date || !form.startTime || !form.endTime) {
      return 'Please fill all required fields.';
    }

    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    const now = new Date();

    if (end <= start) {
      return 'End Time must be greater than Start Time.';
    }

    if (start < now || end < now) {
      return 'Past date and time are not allowed.';
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
      const res = await findParking({
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        vehicleType: form.vehicleType,
        floor: form.floor,
      });
      setResults(res.data || []);
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
    navigate(`/lots/${slot.lotId}`);
  };

  return (
    <div className="find-parking-page user-page-section">
      <section className="user-page-card find-parking-hero">
        <div className="find-parking-hero-copy">
          <p className="find-parking-kicker">Search available parking slots for your visit.</p>
          <p className="find-parking-hero-subtext">Choose date, time, vehicle type, and floor to see live availability.</p>
        </div>
        <div className="find-parking-hero-chip">
          <span className="find-parking-hero-chip-label">Search Filters</span>
          <span className="find-parking-hero-chip-value">Date, time, type and floor</span>
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
            <div className="form-group">
              <label>Parking Date</label>
              <input
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                min={currentMinTime || undefined}
                value={form.startTime}
                onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm((current) => ({ ...current, vehicleType: e.target.value }))}
              >
                <option>Two Wheeler</option>
                <option>Four Wheeler</option>
              </select>
            </div>
            <div className="form-group">
              <label>Floor</label>
              <select
                value={form.floor}
                onChange={(e) => setForm((current) => ({ ...current, floor: e.target.value }))}
              >
                <option>All Floors</option>
                <option>Floor 1</option>
                <option>Floor 2</option>
                <option>Floor 3</option>
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
                    <p>Floor {slot.floor}</p>
                  </div>
                  <span className="find-parking-badge">Available</span>
                </div>

                <div className="find-parking-meta">
                  <div>
                    <span>Vehicle Type</span>
                    <strong>{slot.vehicleType}</strong>
                  </div>
                  <div>
                    <span>Price per Hour</span>
                    <strong>{'\u20B9'}
                      {slot.pricePerHour}
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
