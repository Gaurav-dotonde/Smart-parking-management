import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSlot,
  deleteSlot,
  getAdminSlots,
  getAllLots,
  unwrapList,
  updateSlot,
} from '../services/parkingService';
import { onParkingDataChanged } from '../services/dataSync';

const summaryCards = [
  { title: 'Total Slots', key: 'total', tone: 'blue', icon: 'slots' },
  { title: 'Available', key: 'available', tone: 'green', icon: 'available' },
  { title: 'Booked', key: 'booked', tone: 'red', icon: 'booked' },
  { title: 'Maintenance', key: 'maintenance', tone: 'amber', icon: 'maintenance' },
];

function ManageSlotsIcon({ name }) {
  const commonProps = {
    className: 'dashboard-stat-svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'slots':
      return (
        <svg {...commonProps}>
          <path d="M4 8.5C4 7.11929 5.11929 6 6.5 6H9.5L11 8H17.5C18.8807 8 20 9.11929 20 10.5V16.5C20 17.8807 18.8807 19 17.5 19H6.5C5.11929 19 4 17.8807 4 16.5V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'available':
      return (
        <svg {...commonProps}>
          <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 12L10.8 14.3L15.8 9.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'booked':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'maintenance':
      return (
        <svg {...commonProps}>
          <path d="M14.5 6.5L17.5 3.5L20.5 6.5L17.5 9.5L14.5 6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 8L6 15L5 19L9 18L16 11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

const formatFloor = (value) => {
  if (value === 0) return 'Ground';
  if (value === 1) return 'First';
  if (value === 2) return 'Second';
  if (value === 3) return 'Third';
  return `Floor ${value}`;
};

const getUiStatus = (value) => {
  if (value === 'DISABLED' || value === 'MAINTENANCE') return 'Maintenance';
  if (!value) return 'Unknown';
  return value.charAt(0) + value.slice(1).toLowerCase();
};

const promptValue = (label, defaultValue = '') => {
  const value = window.prompt(label, defaultValue);
  if (value === null) return null;
  return value.trim();
};

const validateSlotForm = ({ slotNumber, floor, vehicleType, status }) => {
  if (!slotNumber) return 'Slot number is required.';
  if (Number.isNaN(floor) || floor < 0 || floor > 100) return 'Floor must be between 0 and 100.';
  if (!vehicleType) return 'Vehicle type is required.';
  if (!['AVAILABLE', 'MAINTENANCE', 'BOOKED', 'RESERVED', 'OCCUPIED'].includes(status)) {
    return 'Status must be AVAILABLE, MAINTENANCE, BOOKED, RESERVED, or OCCUPIED.';
  }
  return '';
};

export default function AdminPanel() {
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const actionRef = useRef(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const lotsRes = await getAllLots();
      const fetchedLots = unwrapList(lotsRes.data);
      const slotResults = await Promise.allSettled(
        fetchedLots.map(async (lot) => {
          const res = await getAdminSlots(lot.id);
          return unwrapList(res.data).map((slot) => ({ ...slot, lotId: lot.id, lotName: lot.name }));
        })
      );
      const loadedSlots = [];
      const failedLots = [];
      slotResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          loadedSlots.push(...result.value);
        } else {
          failedLots.push(fetchedLots[index]?.name || `Lot ${fetchedLots[index]?.id}`);
          if (import.meta.env.DEV) {
            console.error('Failed to load admin slots for lot', {
              lotId: fetchedLots[index]?.id,
              lotName: fetchedLots[index]?.name,
              error: result.reason?.response?.status,
              body: result.reason?.response?.data,
            });
          }
        }
      });
      setLots(fetchedLots);
      setSlots(loadedSlots);
      if (failedLots.length) {
        const failedMessage = `Failed to load parking slots for: ${failedLots.join(', ')}`;
        setError(failedMessage);
        if (!loadedSlots.length) {
          throw new Error(failedMessage);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load parking slots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
    return onParkingDataChanged(() => {
      loadSlots();
    });
  }, [loadSlots]);

  const filteredSlots = useMemo(() => (
    slots.filter((slot) => {
      const term = search.toLowerCase();
      const matchSearch = !term
        || slot.slotNumber?.toLowerCase().includes(term)
        || slot.lotName?.toLowerCase().includes(term);
      const matchFloor = floorFilter === 'All' || formatFloor(slot.floor) === floorFilter;
      const matchVehicleType = vehicleTypeFilter === 'All' || slot.vehicleType === vehicleTypeFilter;
      const matchStatus = statusFilter === 'All' || getUiStatus(slot.status) === statusFilter;

      return matchSearch && matchFloor && matchVehicleType && matchStatus;
    })
  ), [slots, search, floorFilter, vehicleTypeFilter, statusFilter]);

  const summary = useMemo(() => ({
    total: slots.length,
    available: slots.filter((slot) => slot.status === 'AVAILABLE').length,
    booked: slots.filter((slot) => slot.status === 'BOOKED' || slot.status === 'RESERVED' || slot.status === 'OCCUPIED').length,
    maintenance: slots.filter((slot) => slot.status === 'DISABLED' || slot.status === 'MAINTENANCE').length,
  }), [slots]);

  const floorOptions = useMemo(
    () => ['All', ...new Set(slots.map((slot) => formatFloor(slot.floor)))],
    [slots]
  );

  const vehicleTypeOptions = useMemo(
    () => ['All', ...new Set(slots.map((slot) => slot.vehicleType).filter(Boolean))],
    [slots]
  );

  const runSlotAction = async (callback) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setActionLoading(true);
    setError('');
    try {
      await callback();
      await loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save slot changes.');
    } finally {
      setActionLoading(false);
      actionRef.current = false;
    }
  };

  const handleAddSlot = async () => {
    if (!lots.length) {
      setError('Please create a parking lot first before adding slots.');
      return;
    }

    const lotLabel = lots.map((lot) => `${lot.id}: ${lot.name}`).join(', ');
    const lotIdRaw = promptValue(`Enter Parking Lot ID (${lotLabel})`, String(lots[0].id));
    if (lotIdRaw === null) return;

    const slotNumber = promptValue('Enter slot number', '');
    if (slotNumber === null) return;

    const floorRaw = promptValue('Enter floor number (0 for Ground)', '1');
    if (floorRaw === null) return;

    const vehicleType = promptValue('Enter vehicle type', 'Car');
    if (vehicleType === null) return;

    const statusRaw = promptValue('Enter status: AVAILABLE, MAINTENANCE, BOOKED, RESERVED, or OCCUPIED', 'AVAILABLE');
    if (statusRaw === null) return;

    const candidate = {
      slotNumber,
      floor: Number(floorRaw),
      vehicleType,
      status: statusRaw.toUpperCase(),
    };
    const validationError = validateSlotForm(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    await runSlotAction(() => createSlot(Number(lotIdRaw), {
      lotId: Number(lotIdRaw),
      ...candidate,
    }));
  };

  const handleEditSlot = async (slot) => {
    const slotNumber = promptValue('Update slot number', slot.slotNumber);
    if (slotNumber === null) return;

    const floorRaw = promptValue('Update floor number', String(slot.floor));
    if (floorRaw === null) return;

    const vehicleType = promptValue('Update vehicle type', slot.vehicleType || 'Car');
    if (vehicleType === null) return;

    const statusRaw = promptValue('Update status: AVAILABLE, BOOKED, RESERVED, OCCUPIED, or MAINTENANCE', slot.status);
    if (statusRaw === null) return;

    const candidate = {
      slotNumber,
      floor: Number(floorRaw),
      vehicleType,
      status: statusRaw.toUpperCase(),
    };
    const validationError = validateSlotForm(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    await runSlotAction(() => updateSlot(slot.lotId, slot.id, {
      lotId: slot.lotId,
      ...candidate,
    }));
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete slot ${slot.slotNumber}?`)) {
      return;
    }

    await runSlotAction(() => deleteSlot(slot.lotId, slot.id));
  };

  return (
    <div className="container admin-page">
      <div className="manage-slots-head">
        <div>
          <h2 className="page-title">Manage Parking Slots</h2>
          <p className="subtitle">Monitor, filter, and manage all parking slots from one place.</p>
        </div>
        <button type="button" className="btn" onClick={handleAddSlot} disabled={actionLoading}>
          {actionLoading ? 'Saving...' : '+ Add New Slot'}
        </button>
      </div>

      <div className="dashboard-stats-grid manage-slots-stats-grid">
        {summaryCards.map((card) => (
          <div key={card.key} className="card dashboard-stat-card">
            <div className={`dashboard-stat-icon ${card.tone}`}>
              <ManageSlotsIcon name={card.icon} />
            </div>
            <div>
              <span className="dashboard-stat-title">{card.title}</span>
              <strong className="dashboard-stat-value">{summary[card.key]}</strong>
            </div>
          </div>
        ))}
      </div>

      <section className="card manage-slots-card">
        <div className="dashboard-section-head">
          <h3>Filters</h3>
          <p>Find slots quickly by number, floor, type, or status.</p>
        </div>

        <div className="manage-slots-filters">
          <div className="form-group">
            <label>Search by Slot Number</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Slot Number"
            />
          </div>
          <div className="form-group">
            <label>Filter by Floor</label>
            <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
              {floorOptions.map((floor) => <option key={floor}>{floor}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Filter by Vehicle Type</label>
            <select value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value)}>
              {vehicleTypeOptions.map((vehicleType) => <option key={vehicleType}>{vehicleType}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Filter by Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>Available</option>
              <option>Booked</option>
              <option>Reserved</option>
              <option>Maintenance</option>
              <option>Occupied</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card manage-slots-card">
        <div className="dashboard-section-head">
          <h3>Slots Table</h3>
          <p>Review all slot details and manage actions.</p>
        </div>

        {loading && <div className="empty-state">Loading slots...</div>}
        {!loading && error && <div className="error-text">{error}</div>}

        {!loading && !error && (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Slot Number</th>
                  <th>Floor</th>
                  <th>Vehicle Type</th>
                  <th>Price / Hour</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((slot) => {
                  const status = getUiStatus(slot.status);
                  return (
                    <tr key={slot.id}>
                      <td>{slot.slotNumber}</td>
                      <td>{formatFloor(slot.floor)}</td>
                      <td>{slot.vehicleType}</td>
                      <td>Rs {Number(slot.pricePerHour || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${
                          status === 'Available'
                            ? 'badge-active'
                            : status === 'Booked'
                              ? 'badge-cancelled'
                              : 'badge-completed'
                        }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <div className="manage-slots-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => handleEditSlot(slot)} disabled={actionLoading}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteSlot(slot)} disabled={actionLoading}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSlots.length && (
                  <tr>
                    <td colSpan="6" className="empty-state">No slots found for the selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
