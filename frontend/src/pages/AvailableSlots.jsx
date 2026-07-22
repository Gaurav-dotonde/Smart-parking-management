import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLots, getSlots, unwrapList } from '../services/parkingService';
import { onParkingDataChanged } from '../services/dataSync';
import './AvailableSlots.css';

const PAGE_SIZE = 12;
const ALL_LOCATIONS_PREVIEW_SIZE = 6;

function LegendItem({ color, label }) {
  return <div className="slot-legend-item"><span className="slot-legend-swatch" style={{ background: color }} /><span>{label}</span></div>;
}

function slotTone(status) {
  if (status === 'AVAILABLE') return 'available';
  if (status === 'RESERVED') return 'reserved';
  if (status === 'BOOKED' || status === 'OCCUPIED') return 'booked';
  return 'blocked';
}

function SlotChip({ slot, selected, onSelect }) {
  const available = slot.status === 'AVAILABLE';
  return (
    <button
      type="button"
      className={`slot-chip tone-${slotTone(slot.status)}${selected ? ' is-selected' : ''}`}
      disabled={!available}
      title={available ? `View details for ${slot.slotNumber}` : `${slot.slotNumber}: ${slot.status.toLowerCase()}`}
      aria-pressed={selected}
      onClick={() => available && onSelect(slot)}
    >
      {slot.slotNumber}
    </button>
  );
}

function SlotDetailsPanel({ slot, updatedAt, onClose, onBook, panelRef }) {
  if (!slot) return null;
  return (
    <aside ref={panelRef} className="available-slot-details" aria-label={`Details for slot ${slot.slotNumber}`}>
      <div className="available-slot-details-head">
        <div><span className="available-slot-details-eyebrow">Selected parking slot</span><h3>{slot.slotNumber}</h3></div>
        <button type="button" className="available-slot-details-close" onClick={onClose} aria-label="Close slot details">×</button>
      </div>
      <div className="available-slot-details-status"><span className="available-slot-details-dot" />Available now</div>
      <dl className="available-slot-details-grid">
        <div><dt>Slot Number</dt><dd>{slot.slotNumber}</dd></div>
        <div><dt>Parking Location</dt><dd>{slot.lotName}</dd></div>
        <div><dt>Floor</dt><dd>Floor {slot.floor}</dd></div>
        <div><dt>Vehicle Type</dt><dd>{slot.selectedVehicleType}</dd></div>
        <div><dt>Price per Day</dt><dd>₹{slot.pricePerDay}</dd></div>
        <div><dt>Current Status</dt><dd>{slot.status}</dd></div>
        <div><dt>Availability Status</dt><dd className="available-slot-details-available">Available</dd></div>
        <div><dt>Last Updated Time</dt><dd>{updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}</dd></div>
      </dl>
      <p className="available-slot-details-note">Current status is shown here. Confirm your visit details in the booking flow to check availability for your required time.</p>
      <button type="button" className="btn available-slot-details-book" onClick={() => onBook(slot)}>Check Availability &amp; Book</button>
    </aside>
  );
}

export default function AvailableSlots() {
  const navigate = useNavigate();
  const detailsPanelRef = useRef(null);
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [vehicleType, setVehicleType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLotIds, setExpandedLotIds] = useState(() => new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setExpandedLotIds(new Set());
    setSelectedSlot(null);
    try {
      const lotsRes = await getActiveLots();
      const lotList = unwrapList(lotsRes.data);
      const slotResponses = await Promise.all(
        lotList.map((lot) => getSlots(lot.id).then((res) => ({ lot, slots: unwrapList(res.data) })))
      );
      setLots(lotList);
      setSelectedLotId((current) => current && !lotList.some((lot) => String(lot.id) === current) ? '' : current);
      setSlots(slotResponses.flatMap(({ lot, slots: lotSlots }) => lotSlots.map((slot) => ({
        ...slot,
        lotId: lot.id,
        lotName: lot.name,
        pricePerDay: lot.pricePerDay,
      }))));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load parking slots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return onParkingDataChanged(loadData);
  }, [loadData]);

  useEffect(() => {
    const panel = detailsPanelRef.current;
    if (!selectedSlot || !panel) return;

    const bounds = panel.getBoundingClientRect();
    const isVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (!isVisible) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedSlot]);

  const selectedLot = lots.find((lot) => String(lot.id) === selectedLotId) || null;
  const lotSlots = useMemo(() => slots.filter((slot) => !selectedLotId || String(slot.lotId) === selectedLotId), [slots, selectedLotId]);
  const filteredSlots = lotSlots;
  const availableSlots = useMemo(() => filteredSlots.filter((slot) => slot.status === 'AVAILABLE'), [filteredSlots]);
  const priceLabel = useMemo(() => {
    const prices = [...new Set((selectedLot ? [selectedLot] : lots).map((lot) => Number(lot.pricePerDay)).filter(Number.isFinite))];
    if (!prices.length) return '—';
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    return minimum === maximum ? `₹${minimum}` : `₹${minimum}–₹${maximum}`;
  }, [lots, selectedLot]);
  const locationGroups = useMemo(() => {
    const relevantLots = selectedLot ? [selectedLot] : lots;
    return relevantLots.map((lot) => ({
      lot,
      slots: filteredSlots.filter((slot) => String(slot.lotId) === String(lot.id)),
      availableSlots: availableSlots.filter((slot) => String(slot.lotId) === String(lot.id)),
    })).filter((group) => group.slots.length > 0);
  }, [availableSlots, filteredSlots, lots, selectedLot]);

  const previewSize = selectedLot ? PAGE_SIZE : ALL_LOCATIONS_PREVIEW_SIZE;
  const visibleSlots = (groupSlots, lotId) => {
    const expanded = expandedLotIds.has(String(lotId));
    const initialSlots = expanded ? groupSlots : groupSlots.slice(0, previewSize);
    if (!selectedSlot || String(selectedSlot.lotId) !== String(lotId) || initialSlots.some((slot) => slot.id === selectedSlot.id)) return initialSlots;
    return [...initialSlots.slice(0, Math.max(0, previewSize - 1)), selectedSlot];
  };
  const toggleLot = (lotId) => {
    const key = String(lotId);
    setExpandedLotIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bookSlot = (slot) => {
    const bookingVehicleType = slot.selectedVehicleType === 'Car / Two Wheeler'
      ? 'Car'
      : slot.selectedVehicleType || (vehicleType === 'All' ? 'Car' : vehicleType);
    navigate(`/lots/${slot.lotId}?slotId=${slot.id}&vehicleType=${encodeURIComponent(bookingVehicleType)}`);
  };
  const selectSlot = (slot) => setSelectedSlot({ ...slot, selectedVehicleType: vehicleType === 'All' ? 'Car / Two Wheeler' : vehicleType });
  const changeLot = (event) => {
    setSelectedLotId(event.target.value);
    setVehicleType('All');
    setExpandedLotIds(new Set());
    setSelectedSlot(null);
  };

  return (
    <div className="available-slots-page user-page-section">
      <section className="available-slots-hero user-page-card">
        <p className="available-slots-kicker">Browse all currently available parking spaces.</p>
      </section>

      <section className="available-slots-filter user-page-card">
        <div className="available-slots-grid">
          <label className="form-group">Location
            <select className="available-slots-field" value={selectedLotId} onChange={changeLot} disabled={loading || !lots.length}>
              <option value="">{lots.length ? 'All Locations' : 'No lots available'}</option>
              {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
            </select>
          </label>
          <div className="form-group"><label>Available Slots</label><div className="available-slots-field">{loading ? 'Loading...' : availableSlots.length}</div></div>
          <div className="form-group"><label>Price / Day</label><div className="available-slots-field">{priceLabel}</div></div>
          <div className="form-group"><label>Total Slots</label><div className="available-slots-field">{loading ? 'Loading...' : filteredSlots.length}</div></div>
          <label className="form-group">Vehicle Type
            <select className="available-slots-field" value={vehicleType} onChange={(event) => { setVehicleType(event.target.value); setExpandedLotIds(new Set()); setSelectedSlot(null); }}>
              <option value="All">All vehicles</option>
              <option value="Car">Car</option>
              <option value="Two Wheeler">Two Wheeler</option>
            </select>
          </label>
          <div className="available-slots-search"><button type="button" className="btn available-slots-search-btn" onClick={loadData} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
        </div>
        {error && <div className="error-text available-slots-error" role="alert">{error}</div>}
      </section>

      <section className="available-slots-main">
        <div className="available-slots-map-card user-page-card">
          <div className="available-slots-map-head">
            <div><h3>Parking Area Map</h3><p>{selectedLot?.name || 'All Parking Locations'}</p></div>
            <div className="available-slots-map-legend"><LegendItem color="#5ac85a" label="Available" /><LegendItem color="#3b82f6" label="Reserved" /><LegendItem color="#ef4444" label="Booked" /><LegendItem color="#9ca3af" label="Blocked" /></div>
          </div>
          <div className="available-slots-map">
            {!loading && !error && !locationGroups.length && <div className="empty-state">No slots match these filters.</div>}
            {locationGroups.map((group) => {
              const groupSlots = visibleSlots(group.slots, group.lot.id);
              const expanded = expandedLotIds.has(String(group.lot.id));
              return (
                <section key={group.lot.id} className="available-slots-location-group">
                  <div className="available-slots-location-head">
                    <div><strong>{group.lot.name}</strong><span>{group.slots.length} total · {group.availableSlots.length} available</span></div>
                    {group.slots.length > previewSize && <button type="button" onClick={() => toggleLot(group.lot.id)}>{expanded ? 'Show Less' : `View More (${group.slots.length - previewSize})`}</button>}
                  </div>
                  <div className="available-slots-row">{groupSlots.map((slot) => <SlotChip key={slot.id} slot={slot} selected={selectedSlot?.id === slot.id} onSelect={selectSlot} />)}</div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="available-slots-list-card user-page-card">
          <div className="available-slots-list-head"><h3>Available Spots ({availableSlots.length})</h3><div className="available-slots-sort">By slot number</div></div>
          <div className={`available-slots-list-layout${selectedSlot ? ' has-details' : ''}`}>
            <div className="available-slots-list-column">
              <div className="available-slots-list">
                {!loading && !availableSlots.length && <div className="empty-state">No available spots match these filters.</div>}
                {locationGroups.map((group) => {
                  const groupSlots = visibleSlots(group.availableSlots, group.lot.id);
                  const expanded = expandedLotIds.has(String(group.lot.id));
                  if (!group.availableSlots.length) return null;
                  return (
                    <section key={group.lot.id} className="available-spots-location-group">
                      <div className="available-slots-location-head">
                        <div><strong>{group.lot.name}</strong><span>{group.availableSlots.length} available spots</span></div>
                        {group.availableSlots.length > previewSize && <button type="button" onClick={() => toggleLot(group.lot.id)}>{expanded ? 'Show Less' : `View More (${group.availableSlots.length - previewSize})`}</button>}
                      </div>
                      <div className="available-spots-group-list">
                        {groupSlots.map((slot) => (
                          <article
                            key={slot.id}
                            className={`available-slots-item available-slots-selectable${selectedSlot?.id === slot.id ? ' is-selected' : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedSlot?.id === slot.id}
                            onClick={() => selectSlot(slot)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                selectSlot(slot);
                              }
                            }}
                          >
                            <div><strong>{slot.slotNumber}</strong><span>{slot.lotName}</span></div>
                            <div className="available-slots-item-meta">Floor {slot.floor}</div>
                            <div className="available-slots-item-price">₹{slot.pricePerDay} / day</div>
                            <span className="available-slots-view-details">View Details</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
            <SlotDetailsPanel panelRef={detailsPanelRef} slot={selectedSlot} updatedAt={lastUpdated} onClose={() => setSelectedSlot(null)} onBook={bookSlot} />
          </div>
        </div>
      </section>

      <section className="available-slots-features">
        <article className="available-slots-feature-card"><div className="available-slots-feature-icon tone-blue">✓</div><div><strong>Secure Booking</strong><p>Your booking is safe and protected</p></div></article>
        <article className="available-slots-feature-card"><div className="available-slots-feature-icon tone-green">↻</div><div><strong>Real-time Availability</strong><p>Live updates on parking slot availability</p></div></article>
        <article className="available-slots-feature-card"><div className="available-slots-feature-icon tone-purple">₹</div><div><strong>Best Rates</strong><p>Affordable pricing and best offers</p></div></article>
        <article className="available-slots-feature-card"><div className="available-slots-feature-icon tone-amber">?</div><div><strong>24/7 Support</strong><p>We're here to help you anytime</p></div></article>
      </section>
    </div>
  );
}
