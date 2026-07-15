import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLots, getSlots, unwrapList } from '../services/parkingService';
import { onParkingDataChanged } from '../services/dataSync';

function LegendItem({ color, label }) {
  return (
    <div className="slot-legend-item">
      <span className="slot-legend-swatch" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function SlotChip({ label, tone = 'available' }) {
  return <div className={`slot-chip tone-${tone}`}>{label}</div>;
}

export default function AvailableSlots() {
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const loadData = async (mounted = true) => {
      setLoading(true);
      setError('');
      try {
        const lotsRes = await getActiveLots();
        const lotList = unwrapList(lotsRes.data);
        if (!mounted) return;
        setLots(lotList);
        const slotResponses = await Promise.all(
        lotList.map((lot) => getSlots(lot.id).then((res) => ({ lot, slots: unwrapList(res.data) })))
        );
      if (!mounted) return;
      const flattened = slotResponses.flatMap(({ lot, slots: lotSlots }) =>
        lotSlots.map((slot) => ({
          ...slot,
          lotId: lot.id,
          lotName: lot.name,
          pricePerHour: lot.pricePerHour,
          lotActive: lot.active,
        }))
      );
      setSlots(flattened);
    } catch (err) {
      if (mounted) {
        setError(err.response?.data?.message || 'Failed to load available slots.');
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData(mounted);
    const unsubscribe = onParkingDataChanged(() => {
      loadData(mounted);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refreshToken]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.status === 'AVAILABLE'), [slots]);
  const primaryLot = lots[0];
  const displaySlots = availableSlots.slice(0, 12);

  return (
    <div className="available-slots-page user-page-section">
      <section className="available-slots-hero user-page-card">
        <p className="available-slots-kicker">Browse all currently available parking spaces.</p>
      </section>

      <section className="available-slots-filter user-page-card">
        <div className="available-slots-grid">
          <div className="form-group">
            <label>Location</label>
            <div className="available-slots-field">{primaryLot?.name || 'No lots available'}</div>
          </div>
          <div className="form-group">
            <label>Available Slots</label>
            <div className="available-slots-field">{loading ? 'Loading...' : availableSlots.length}</div>
          </div>
          <div className="form-group">
            <label>Price / Hour</label>
            <div className="available-slots-field">
              {primaryLot ? `₹${primaryLot.pricePerHour}` : '—'}
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <div className="available-slots-field">Live database data</div>
          </div>
          <div className="form-group">
            <label>Vehicle Type</label>
            <div className="available-slots-field">{primaryLot?.vehicleType || 'Car'}</div>
          </div>
          <div className="available-slots-search">
            <button type="button" className="btn available-slots-search-btn" onClick={() => setRefreshToken((value) => value + 1)}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="available-slots-main">
        <div className="available-slots-map-card user-page-card">
          <div className="available-slots-map-head">
            <div>
              <h3>Parking Area Map</h3>
              <p>{primaryLot ? primaryLot.name : 'Live parking data'}</p>
            </div>
            <div className="available-slots-map-legend">
              <LegendItem color="#5ac85a" label="Available" />
              <LegendItem color="#3b82f6" label="Reserved" />
              <LegendItem color="#ef4444" label="Booked" />
              <LegendItem color="#9ca3af" label="Blocked" />
            </div>
          </div>

          <div className="available-slots-map">
            {(loading || displaySlots.length === 0) && <div className="empty-state">{error || 'No slots available.'}</div>}
            {!loading && displaySlots.length > 0 && (
              <div className="available-slots-row top">
                {displaySlots.slice(0, 7).map((slot) => (
                  <SlotChip key={slot.id} label={slot.slotNumber} tone={slot.status === 'AVAILABLE' ? 'available' : 'blocked'} />
                ))}
              </div>
            )}
            {!loading && displaySlots.length > 7 && (
              <div className="available-slots-row bottom">
                {displaySlots.slice(7, 12).map((slot) => (
                  <SlotChip key={slot.id} label={slot.slotNumber} tone={slot.status === 'AVAILABLE' ? 'available' : 'blocked'} />
                ))}
              </div>
            )}
          </div>

          <div className="available-slots-note">Live availability is loaded from the backend.</div>
        </div>

        <div className="available-slots-list-card user-page-card">
          <div className="available-slots-list-head">
            <h3>Available Spots ({availableSlots.length})</h3>
            <div className="available-slots-sort">Nearest</div>
          </div>

          <div className="available-slots-list">
            {displaySlots.map((slot) => (
              <article key={slot.id} className="available-slots-item">
                <div>
                  <strong>{slot.slotNumber}</strong>
                  <span>{slot.lotName}</span>
                </div>
                <div className="available-slots-item-meta">Floor {slot.floor}</div>
                <div className="available-slots-item-price">₹{slot.pricePerHour} / hr</div>
                <button type="button" className="btn available-slots-book-btn" onClick={() => navigate(`/lots/${slot.lotId}`)}>
                  Book Now
                </button>
              </article>
            ))}
          </div>

          <div className="available-slots-view-all">View All {availableSlots.length} Available Spots →</div>
        </div>
      </section>

      <section className="available-slots-features">
        <article className="available-slots-feature-card">
          <div className="available-slots-feature-icon tone-blue">🛡</div>
          <div>
            <strong>Secure Booking</strong>
            <p>Your booking is safe and protected</p>
          </div>
        </article>
        <article className="available-slots-feature-card">
          <div className="available-slots-feature-icon tone-green">⏱</div>
          <div>
            <strong>Real-time Availability</strong>
            <p>Live updates on parking slot availability</p>
          </div>
        </article>
        <article className="available-slots-feature-card">
          <div className="available-slots-feature-icon tone-purple">🏷</div>
          <div>
            <strong>Best Rates</strong>
            <p>Affordable pricing and best offers</p>
          </div>
        </article>
        <article className="available-slots-feature-card">
          <div className="available-slots-feature-icon tone-amber">👤</div>
          <div>
            <strong>24/7 Support</strong>
            <p>We're here to help you anytime</p>
          </div>
        </article>
      </section>
    </div>
  );
}
