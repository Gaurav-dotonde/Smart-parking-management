import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminModal from '../components/AdminModal';
import {
  getActiveLots,
  getAdminSlotsPaged,
  getSlotSummary,
  bulkCreateSlots,
  createSlot,
  setSlotStatus,
  updateSlot,
  archiveSlot,
  unwrapList,
  unwrapPage
} from '../services/parkingService';

const vehicleTypes = ['Two Wheeler', 'Car', 'SUV', 'Commercial Vehicle'];
const slotTypes = ['STANDARD', 'COMPACT', 'LARGE', 'ACCESSIBLE', 'EV CHARGING', 'VIP'];
const statuses = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'];
const editableStatuses = ['AVAILABLE', 'MAINTENANCE', 'INACTIVE'];
const pageSizes = [10, 25, 50, 100];
const ordinalFloorNames = ['Ground', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'];
const floorName = (floor) => Number.isInteger(Number(floor)) && Number(floor) >= 0 ? `${ordinalFloorNames[Number(floor)] || `Floor ${floor}`} Floor` : '—';

const emptySlot = { lotId: '', slotNumber: 'AUTO', floor: 0, zone: '', vehicleType: 'Car', slotType: 'STANDARD', priceOverride: '', status: 'AVAILABLE', evChargingAvailable: false, accessibleSlot: false, notes: '' };
const emptyBulk = { lotId: '', prefix: 'A', startingNumber: 1, count: 20, floor: 0, zone: '', vehicleType: 'Car', slotType: 'STANDARD', defaultStatus: 'AVAILABLE', priceOverride: '' };
const field = (form, setForm, name) => ({ value: form[name], onChange: (e) => setForm((current) => ({ ...current, [name]: e.target.value })) });

export default function AdminPanel() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [lots, setLots] = useState([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [summary, setSummary] = useState(null);
  const [slotsPage, setSlotsPage] = useState(null);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [filters, setFilters] = useState({ search: '', floor: '', zone: '', vehicleType: '', slotType: '', status: '' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const searchTimerRef = useRef(null);

  const modal = { type: null, slot: null, status: '' };
  const [modalState, setModalState] = useState(modal);
  const [form, setForm] = useState(emptySlot);
  const [bulk, setBulk] = useState(emptyBulk);

  const activeLots = useMemo(() => lots.filter((lot) => !lot.archived), [lots]);
  const selectedLot = useMemo(() => activeLots.find((lot) => String(lot.id) === String(selectedLotId)), [activeLots, selectedLotId]);

  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      setLoadingLots(true);
      try {
        const response = await getActiveLots();
        const available = unwrapList(response.data);
        if (!active) return;
        setLots(available);
        const urlLotId = params.get('locationId') || params.get('lotId');
        const validUrl = available.some((lot) => String(lot.id) === String(urlLotId));
        const initialId = validUrl ? String(urlLotId) : 'all';
        setSelectedLotId(initialId);
      } catch (error) {
        if (active) setLoadError(error.response?.data?.message || 'Unable to load parking locations.');
      } finally {
        if (active) setLoadingLots(false);
      }
    };
    loadLocations();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedLotId) {
      setSummary(null);
      setSlotsPage(null);
      return;
    }
    setLoadingSummary(true);
    setLoadError('');
    getSlotSummary(selectedLotId === 'all' ? null : selectedLotId)
      .then((res) => {
        const data = res.data;
        setSummary(data);
      })
      .catch((error) => {
        setLoadError(error.response?.data?.message || 'Unable to load location summary.');
        setSummary(null);
      })
      .finally(() => setLoadingSummary(false));
  }, [selectedLotId]);

  const loadSlots = useCallback((lotId, pageOverride, sizeOverride, filterOverride) => {
    const targetLotId = lotId || selectedLotId;
    if (!targetLotId) { setSlotsPage(null); return; }
    setLoadingSlots(true);
    setLoadError('');
    const p = pageOverride ?? page;
    const s = sizeOverride ?? pageSize;
    const f = filterOverride ?? filters;
    const requestParams = {
      page: p,
      size: s,
      ...(f.search ? { search: f.search } : {}),
      ...(f.floor !== '' ? { floor: f.floor } : {}),
      ...(f.zone ? { zone: f.zone } : {}),
      ...(f.vehicleType ? { vehicleType: f.vehicleType } : {}),
      ...(f.slotType ? { slotType: f.slotType } : {}),
      ...(f.status ? { status: f.status } : {}),
    };
    getAdminSlotsPaged(targetLotId === 'all' ? null : targetLotId, requestParams)
      .then((res) => {
        const data = unwrapPage(res.data) || res.data;
        setSlotsPage(data);
      })
      .catch((error) => {
        setLoadError(error.response?.data?.message || 'Unable to load parking slots.');
        setSlotsPage(null);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedLotId, page, pageSize, filters]);

  useEffect(() => {
    if (selectedLotId) loadSlots(selectedLotId);
  }, [selectedLotId, page, pageSize, filters.search, filters.floor, filters.zone, filters.vehicleType, filters.slotType, filters.status, loadSlots]);

  useEffect(() => {
    const requestedStatus = params.get('status') || '';
    if (requestedStatus && statuses.includes(requestedStatus) && requestedStatus !== filters.status) {
      setFilters((current) => ({ ...current, status: requestedStatus }));
      setPage(0);
    }
  }, [params, filters.status]);

  useEffect(() => {
    if (params.get('action') === 'add' && selectedLotId && selectedLotId !== 'all') {
      setForm({ ...emptySlot, lotId: selectedLotId });
      setModalState({ type: 'add', slot: null, status: '' });
    }
  }, [params, selectedLotId]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleLocationChange = (event) => {
    const newId = event.target.value;
    setSelectedLotId(newId);
    setPage(0);
    setFilters({ search: '', floor: '', zone: '', vehicleType: '', slotType: '', status: '' });
    setModalState({ type: null, slot: null, status: '' });
    if (newId && newId !== 'all') {
      params.set('locationId', newId);
      params.delete('lotId');
    } else {
      params.delete('locationId');
      params.delete('lotId');
    }
    setParams(params, { replace: true });
  };

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(0);
  };

  const handleSearchChange = (value) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    handleFilterChange('search', value);
  };

  const handleFloorSelect = (floor) => {
    setFilters((current) => ({ ...current, floor: floor ?? '' }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ search: '', floor: '', zone: '', vehicleType: '', slotType: '', status: '' });
    setPage(0);
  };

  const closeModal = () => {
    setModalState({ type: null, slot: null, status: '' });
    setForm(emptySlot);
    setBulk(emptyBulk);
    if (params.has('action')) {
      params.delete('action');
      setParams(params, { replace: true });
    }
  };

  const openView = (slot) => setModalState({ type: 'view', slot, status: '' });
  const openEdit = (slot) => {
    setForm({
      lotId: String(slot.lotId || slot.parkingLotId),
      slotNumber: slot.slotNumber,
      floor: slot.floor,
      zone: slot.zone || '',
      vehicleType: slot.vehicleType,
      slotType: slot.slotType || 'STANDARD',
      priceOverride: slot.priceOverride ?? '',
      status: slot.status,
      evChargingAvailable: Boolean(slot.evChargingAvailable),
      accessibleSlot: Boolean(slot.accessibleSlot),
      notes: slot.notes || ''
    });
    setModalState({ type: 'edit', slot, status: '' });
  };
  const openStatus = (slot, status) => setModalState({ type: 'status', slot, status });
  const openArchive = (slot) => setModalState({ type: 'archive', slot, status: '' });

  const saveSlot = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        lotId: Number(form.lotId),
        floor: Number(form.floor),
        priceOverride: form.priceOverride === '' ? null : Number(form.priceOverride)
      };
      if (modalState.type === 'add') {
        await createSlot(payload.lotId, payload);
        setMessage({ type: 'success', text: 'Parking slot created.' });
      } else {
        await updateSlot(payload.lotId, modalState.slot.id, payload);
        setMessage({ type: 'success', text: 'Parking slot updated.' });
      }
      closeModal();
      await refreshSelectedLocation();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to save parking slot.' });
    } finally {
      setSaving(false);
    }
  };

  const saveBulk = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const request = {
        ...bulk,
        startingNumber: Number(bulk.startingNumber),
        count: Number(bulk.count),
        floor: Number(bulk.floor),
        priceOverride: bulk.priceOverride === '' ? null : Number(bulk.priceOverride)
      };
      const { data } = await bulkCreateSlots(bulk.lotId, request);
      setMessage({ type: 'success', text: `${data.created} slots created; ${data.skipped} skipped; ${data.failed} failed.` });
      closeModal();
      await refreshSelectedLocation();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to bulk-create slots.' });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!modalState.slot) return;
    setSaving(true);
    try {
      await setSlotStatus(modalState.slot.id, modalState.status);
      setMessage({ type: 'success', text: `Slot status changed to ${modalState.status}.` });
      closeModal();
      await refreshSelectedLocation();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change slot status.' });
    } finally {
      setSaving(false);
    }
  };

  const archiveSlotAction = async () => {
    if (!modalState.slot) return;
    setSaving(true);
    try {
      await archiveSlot(modalState.slot.id);
      setMessage({ type: 'success', text: 'Slot archived without deleting booking history.' });
      closeModal();
      await refreshSelectedLocation();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to archive slot.' });
    } finally {
      setSaving(false);
    }
  };

  const refreshSelectedLocation = async () => {
    if (!selectedLotId) return;
    const summaryPromise = getSlotSummary(selectedLotId === 'all' ? null : selectedLotId).then((res) => setSummary(res.data)).catch(() => setSummary(null));
    await loadSlots(selectedLotId, page, pageSize, filters);
    await summaryPromise;
  };

  const currentSlots = slotsPage?.content || [];
  const totalElements = slotsPage?.totalElements || 0;
  const totalPages = slotsPage?.totalPages || 1;
  const isFirst = slotsPage?.first ?? true;
  const isLast = slotsPage?.last ?? true;

  const floorSummaries = useMemo(() => {
    if (!summary?.floors) return [];
    return summary.floors.map((f) => ({
      value: f.floor,
      label: f.floorName || `Floor ${f.floor}`,
      total: f.total,
      available: f.available,
      reserved: f.reserved,
      booked: f.booked,
      occupied: f.occupied
    }));
  }, [summary]);

  const statusCounts = useMemo(() => {
    if (!summary) return {};
    return {
      total: summary.totalSlots,
      available: summary.available,
      reserved: summary.reserved,
      booked: summary.booked,
      occupied: summary.occupied,
      maintenance: summary.maintenance,
      disabled: summary.disabled
    };
  }, [summary]);

  const visibleSlots = currentSlots;
  const pagedStart = totalElements === 0 ? 0 : (page * pageSize) + 1;
  const pagedEnd = Math.min((page + 1) * pageSize, totalElements);
  const summaryCards = [
    ['total', 'Total Slots', statusCounts.total || 0, 'grid'],
    ['available', 'Available', statusCounts.available || 0, 'check'],
    ['booked', 'Booked', statusCounts.booked || 0, 'calendar'],
    ['reserved', 'Reserved', statusCounts.reserved || 0, 'bookmark'],
    ['occupied', 'Occupied', statusCounts.occupied || 0, 'car'],
    ['maintenance', 'Maintenance', statusCounts.maintenance || 0, 'tool']
  ];

  return (
    <div className="admin-module-page admin-slots-page">
      {message && <div className={`admin-toast ${message.type}`}>{message.text}</div>}
      <nav className="slots-breadcrumb" aria-label="Breadcrumb"><span>Parking Locations</span><b>›</b><span>{selectedLotId === 'all' ? 'All Locations' : selectedLot?.name || 'Select location'}</span><b>›</b><strong>Parking Slots</strong></nav>
      <div className="admin-module-head">
        <div>
          <h2>Parking Slots</h2>
          <p>Manage parking slots across all floors.</p>
        </div>
        <div className="admin-head-actions">
          <button className="slots-icon-action" title="Bulk add parking slots" aria-label="Bulk add parking slots" disabled={!selectedLotId || selectedLotId === 'all'} onClick={() => { setBulk({ ...emptyBulk, lotId: selectedLotId }); setModalState({ type: 'bulk', slot: null, status: '' }); if (params.get('action') !== 'add') { params.set('action', 'bulk'); setParams(params, { replace: true }); } }}><Icon name="layers" /></button>
          <button className="admin-primary-button slots-add-button" disabled={!selectedLotId || selectedLotId === 'all'} onClick={() => { setForm({ ...emptySlot, lotId: selectedLotId }); setModalState({ type: 'add', slot: null, status: '' }); if (params.get('action') !== 'add') { params.set('action', 'add'); setParams(params, { replace: true }); } }}><Icon name="plus" /> Add Parking Slot</button>
        </div>
      </div>

      <section className="admin-toolbar">
        <label style={{ width: '100%', maxWidth: '420px' }}>
          <span>Parking Location *</span>
          <select value={selectedLotId} onChange={handleLocationChange} disabled={loadingLots || !activeLots.length}>
            <option value="all">All Locations</option>
            {activeLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
          </select>
        </label>
      </section>

      {!selectedLotId ? (
        <div className="admin-data-card">
          <div className="admin-empty-compact">
            {loadingLots ? <span className="admin-spinner" /> : 'Select a parking location to manage its slots.'}
          </div>
        </div>
      ) : (
        <>
          {loadError && <div className="admin-inline-error" role="alert">{loadError}<button type="button" onClick={() => refreshSelectedLocation()}>Retry</button></div>}

          <section className="admin-slot-summary">
            {loadingSummary && !summary ? <div className="admin-empty-compact"><span className="admin-spinner" /> Loading summary…</div> : summary && <>
              {summaryCards.map(([tone, label, value, icon]) => <article key={tone} className={tone}><span className="slots-stat-icon"><Icon name={icon} /></span><small>{label}</small><strong>{value}</strong></article>)}
            </>}
          </section>

          <section className="admin-floor-overview">
            {floorSummaries.map((floor) => (
              <article key={floor.value} className={`admin-floor-card ${filters.floor === String(floor.value) ? 'active' : ''}`} onClick={() => handleFloorSelect(floor.value === filters.floor ? '' : String(floor.value))}>
                <div><span className="slots-floor-icon"><Icon name="parking" /></span><strong>{floor.label}</strong></div>
                <p><b>{floor.total}</b> Total <i /> <b>{floor.available}</b> Available <i /> <b>{floor.booked}</b> Booked</p>
              </article>
            ))}
          </section>

          <section className="admin-slot-filters">
            <label><span>Search Slot</span><input placeholder="Search slot number" value={filters.search} onChange={(e) => handleSearchChange(e.target.value)} /></label>
            <label><span>Zone</span><input placeholder="All zones" value={filters.zone} onChange={(e) => handleFilterChange('zone', e.target.value)} /></label>
            <label><span>Vehicle Type</span><select value={filters.vehicleType} onChange={(e) => handleFilterChange('vehicleType', e.target.value)}><option value="">All types</option>{vehicleTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
            <label><span>Slot Type</span><select value={filters.slotType} onChange={(e) => handleFilterChange('slotType', e.target.value)}><option value="">All types</option>{slotTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
            <label><span>Status</span><select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}><option value="">All statuses</option>{statuses.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
            <label><span>Page Size</span><div className="slots-page-size-control"><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>{pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}</select><button className="admin-secondary-button" type="button" onClick={clearFilters}>Reset Filters</button></div></label>
          </section>

          <section className="admin-data-card">
            {loadingSlots && !slotsPage ? <div className="admin-empty-compact"><span className="admin-spinner" /> Loading slots…</div> : !activeLots.length ? (
              <div className="admin-empty-compact">
                No parking locations found.
                <button className="admin-primary-button" style={{ marginTop: 12 }} onClick={() => navigate('/admin/lots', { replace: true })}>Add Parking Location</button>
              </div>
            ) : !summary && !loadError ? (
              <div className="admin-empty-compact"><span className="admin-spinner" /> Loading summary…</div>
            ) : totalElements === 0 ? (
              <div className="admin-empty-compact">
                {selectedLotId === 'all' ? 'No slots found across any parking location.' : 'No slots found for this location.'}
                {selectedLotId !== 'all' && <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="admin-secondary-button" onClick={() => { setForm({ ...emptySlot, lotId: selectedLotId }); setModalState({ type: 'add', slot: null, status: '' }); params.set('action', 'add'); setParams(params, { replace: true }); }}>Add Slot</button>
                  <button className="admin-primary-button" onClick={() => { setBulk({ ...emptyBulk, lotId: selectedLotId }); setModalState({ type: 'bulk', slot: null, status: '' }); params.set('action', 'bulk'); setParams(params, { replace: true }); }}>Bulk Add Slots</button>
                </div>}
              </div>
            ) : visibleSlots.length === 0 && !loadingSlots ? (
              <div className="admin-empty-compact">
                No slots match the current search and filters.
                <button className="admin-secondary-button" style={{ marginTop: 12 }} onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="admin-responsive-table">
                <table className="admin-slot-table">
                  <thead>
                    <tr>
                      <th>Slot Number</th>
                      <th>Floor</th>
                      <th>Zone</th>
                      <th>Vehicle Type</th>
                      <th>Slot Type</th>
                      <th>Price Per Day</th>
                      <th>Status</th>
                      <th>Current Booking</th>
                      <th className="admin-actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td><button className="admin-slot-number" onClick={() => openView(slot)}>{slot.slotNumber}</button></td>
                        <td>{slot.floor != null ? floorName(slot.floor) : '—'}</td>
                        <td>{slot.zone || '—'}</td>
                        <td>{slot.vehicleType}</td>
                        <td>{slot.slotType}</td>
                        <td>₹{Number(slot.pricePerDay || 0).toFixed(2)}</td>
                        <td><span className={`admin-status ${slot.status.toLowerCase()}`}>{slot.status}</span></td>
                        <td>{slot.currentBookingId ? `#${slot.currentBookingId}` : '—'}</td>
                        <td className="admin-actions-column">
                          <div className="admin-row-actions">
                            <button className="slots-table-action" title="View slot" aria-label={`View ${slot.slotNumber}`} onClick={() => openView(slot)}><Icon name="eye" /></button>
                            <button className="slots-table-action" title="Edit slot" aria-label={`Edit ${slot.slotNumber}`} onClick={() => openEdit(slot)}><Icon name="edit" /></button>
                            <button className="slots-table-action danger" title="Delete slot" aria-label={`Delete ${slot.slotNumber}`} onClick={() => openArchive(slot)}><Icon name="trash" /></button>
                            <DropdownTrigger label={<Icon name="more" />} iconOnly>
                              <DropdownItem onClick={() => openView(slot)}>View</DropdownItem>
                              <DropdownItem onClick={() => openEdit(slot)}>Edit</DropdownItem>
                              <DropdownItem onClick={() => openStatus(slot, slot.status)}>Change Status</DropdownItem>
                              <DropdownItem onClick={() => openStatus(slot, 'MAINTENANCE')}>Mark Maintenance</DropdownItem>
                              <DropdownItem onClick={() => openStatus(slot, 'INACTIVE')}>Disable</DropdownItem>
                            </DropdownTrigger>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingSlots && visibleSlots.length > 0 && (
              <div className="admin-pagination">
                <label>
                  Showing {pagedStart}–{pagedEnd} of {totalElements}
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} style={{ marginLeft: 8 }}>
                    {pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <div>
                  <button disabled={isFirst || page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
                  {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                    <button key={p} className={page === p ? 'active' : ''} disabled={page === p} onClick={() => setPage(p)} style={page === p ? { background: '#1677e8', color: '#fff', borderColor: '#1677e8' } : {}}>
                      {p + 1}
                    </button>
                  ))}
                  <button disabled={isLast || page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <AdminModal open={modalState.type === 'add' || modalState.type === 'edit'} title={modalState.type === 'add' ? 'Add Parking Slot' : 'Edit Parking Slot'} onClose={saving ? undefined : closeModal} size="large">
        <form className="admin-form-grid" onSubmit={saveSlot}>
          <label><span>Parking Location *</span><select required disabled={modalState.type === 'edit'} value={form.lotId} onChange={(e) => setForm((c) => ({ ...c, lotId: e.target.value }))}><option value="">Select location</option>{activeLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}</select></label>
          <label><span>Slot Number</span><input disabled value="Assigned automatically" /></label>
          <label><span>Floor</span><select disabled value={form.floor}><option value={form.floor}>{floorName(form.floor)}</option></select></label>
          <label><span>Zone / Section</span><input value={form.zone} onChange={(e) => setForm((c) => ({ ...c, zone: e.target.value }))} /></label>
          <label><span>Vehicle Type *</span><select required value={form.vehicleType} onChange={(e) => setForm((c) => ({ ...c, vehicleType: e.target.value }))}>{vehicleTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span>Slot Type *</span><select required value={form.slotType} onChange={(e) => setForm((c) => ({ ...c, slotType: e.target.value }))}>{slotTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span>Price Per Day Override</span><input min="0" step="0.01" type="number" value={form.priceOverride} onChange={(e) => setForm((c) => ({ ...c, priceOverride: e.target.value }))} /></label>
          <label><span>Status *</span><select required value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>{(modalState.type === 'edit' && !editableStatuses.includes(form.status) ? [form.status, ...editableStatuses] : editableStatuses).map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="admin-check-label"><input type="checkbox" checked={form.evChargingAvailable} onChange={(e) => setForm((c) => ({ ...c, evChargingAvailable: e.target.checked }))} /> EV charging available</label>
          <label className="admin-check-label"><input type="checkbox" checked={form.accessibleSlot} onChange={(e) => setForm((c) => ({ ...c, accessibleSlot: e.target.checked }))} /> Accessible slot</label>
          <label className="span-2"><span>Notes</span><textarea maxLength="1000" value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} /></label>
          <div className="admin-form-actions span-2">
            <button type="button" className="admin-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="admin-primary-button" disabled={saving}>{saving ? 'Saving…' : modalState.type === 'add' ? 'Create Slot' : 'Update Slot'}</button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={modalState.type === 'bulk'} title="Bulk Add Parking Slots" subtitle="Existing duplicate numbers are skipped before the transactional insert." onClose={saving ? undefined : closeModal} size="large">
        <form className="admin-form-grid" onSubmit={saveBulk}>
          <label><span>Parking Location *</span><select required value={bulk.lotId} onChange={(e) => setBulk((c) => ({ ...c, lotId: e.target.value }))}><option value="">Select location</option>{activeLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}</select></label>
          <label><span>Floor *</span><select required value={bulk.floor} onChange={(e) => setBulk((c) => ({ ...c, floor: Number(e.target.value) }))}>{floorSummaries.map((floor) => <option key={floor.value} value={floor.value}>{floor.label}</option>)}</select></label>
          <label><span>Zone</span><input value={bulk.zone} onChange={(e) => setBulk((c) => ({ ...c, zone: e.target.value }))} /></label>
          <label><span>Slot Prefix *</span><input required pattern="[A-Za-z0-9-]+" value={bulk.prefix} onChange={(e) => setBulk((c) => ({ ...c, prefix: e.target.value }))} /></label>
          <label><span>Starting Number *</span><input required min="0" type="number" value={bulk.startingNumber} onChange={(e) => setBulk((c) => ({ ...c, startingNumber: Number(e.target.value) }))} /></label>
          <label><span>Number of Slots *</span><input required min="1" max="500" type="number" value={bulk.count} onChange={(e) => setBulk((c) => ({ ...c, count: Number(e.target.value) }))} /></label>
          <label><span>Vehicle Type</span><select value={bulk.vehicleType} onChange={(e) => setBulk((c) => ({ ...c, vehicleType: e.target.value }))}>{vehicleTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span>Slot Type</span><select value={bulk.slotType} onChange={(e) => setBulk((c) => ({ ...c, slotType: e.target.value }))}>{slotTypes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span>Default Status</span><select value={bulk.defaultStatus} onChange={(e) => setBulk((c) => ({ ...c, defaultStatus: e.target.value }))}>{editableStatuses.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span>Price Per Day Override</span><input min="0" step="0.01" type="number" value={bulk.priceOverride} onChange={(e) => setBulk((c) => ({ ...c, priceOverride: e.target.value }))} /></label>
          <div className="admin-form-actions span-2">
            <button type="button" className="admin-secondary-button" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="admin-primary-button" disabled={saving}>{saving ? 'Creating…' : 'Create Slots'}</button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={modalState.type === 'view'} title={`Slot ${modalState.slot?.slotNumber || ''}`} subtitle="Current operational and booking details" onClose={closeModal}>
        <div className="admin-details-grid">
          <div><span>Slot ID</span><strong>#{modalState.slot?.id}</strong></div>
          <div><span>Slot Number</span><strong>{modalState.slot?.slotNumber}</strong></div>
          <div className="span-2"><span>Parking Location</span><strong>{modalState.slot?.lotName || modalState.slot?.parkingLotName}</strong><small>{modalState.slot?.lotAddress}</small></div>
          <div><span>Floor / Zone</span><strong>{floorName(modalState.slot?.floor)} / {modalState.slot?.zone || '—'}</strong></div>
          <div><span>Vehicle / Slot Type</span><strong>{modalState.slot?.vehicleType} / {modalState.slot?.slotType}</strong></div>
          <div><span>Price Per Day</span><strong>₹{Number(modalState.slot?.pricePerDay || 0).toFixed(2)}</strong></div>
          <div><span>Status</span><strong>{modalState.slot?.status}</strong></div>
          <div><span>Current Booking</span><strong>{modalState.slot?.currentBookingId ? `#${modalState.slot.currentBookingId}` : 'No active booking'}</strong><small>{modalState.slot?.currentUser} {modalState.slot?.currentUserEmail}</small></div>
          <div><span>Vehicle</span><strong>{modalState.slot?.currentVehicleNumber || 'N/A'}</strong></div>
          <div><span>Created Date</span><strong>{modalState.slot?.createdAt ? new Date(modalState.slot.createdAt).toLocaleString() : 'N/A'}</strong></div>
          <div><span>Updated Date</span><strong>{modalState.slot?.updatedAt ? new Date(modalState.slot.updatedAt).toLocaleString() : 'N/A'}</strong></div>
          <div><span>Features</span><strong>{[modalState.slot?.evChargingAvailable && 'EV charging', modalState.slot?.accessibleSlot && 'Accessible'].filter(Boolean).join(', ') || 'Standard'}</strong></div>
          {modalState.slot?.notes && <div className="span-2"><span>Notes</span><strong>{modalState.slot.notes}</strong></div>}
        </div>
      </AdminModal>

      <AdminModal open={modalState.type === 'status'} title="Change slot status" subtitle="Booking-controlled statuses cannot be assigned manually." onClose={saving ? undefined : closeModal}>
        <div className="admin-confirm-copy">
          <label className="admin-modal-select"><span>New Status</span><select value={modalState.status || ''} onChange={(e) => setModalState((current) => ({ ...current, status: e.target.value }))}>{statuses.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <div className="admin-form-actions">
            <button className="admin-secondary-button" onClick={closeModal}>Cancel</button>
            <button className="admin-primary-button" onClick={changeStatus} disabled={saving}>Update Status</button>
          </div>
        </div>
      </AdminModal>

      <AdminModal open={modalState.type === 'archive'} title="Archive parking slot?" subtitle="Historical bookings remain attached to this slot." onClose={saving ? undefined : closeModal}>
        <div className="admin-confirm-copy">
          <p>Slot <strong>{modalState.slot?.slotNumber}</strong> will be disabled and hidden from active slot management. An active or occupied slot cannot be archived.</p>
          <div className="admin-form-actions">
            <button className="admin-secondary-button" onClick={closeModal}>Cancel</button>
            <button className="admin-danger-button" onClick={archiveSlotAction} disabled={saving}>Archive Slot</button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

function DropdownTrigger({ label, children, iconOnly = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className={iconOnly ? 'slots-table-action' : 'admin-secondary-button'} title={iconOnly ? 'More slot actions' : undefined} aria-label={iconOnly ? 'More slot actions' : undefined} onClick={() => setOpen((v) => !v)}>{label}{!iconOnly && ' ▾'}</button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, minWidth: 180, marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', boxShadow: '0 12px 30px rgba(15,23,42,.12)', padding: 6 }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ onClick, children }) {
  return <button type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, background: 'transparent', color: '#1e293b', fontSize: '.82rem', cursor: 'pointer', borderRadius: 6 }} onClick={() => onClick()}>{children}</button>;
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    check: <path d="m5 12 4 4L19 6" />, calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4z" />, car: <><path d="m5 17-1 3h16l-1-3M5 17h14l-2-7H7z" /><path d="M6 12h12M7 20v2M17 20v2" /></>,
    tool: <path d="m14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-2-2z" />, ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
    parking: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>, layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>, plus: <path d="M12 5v14M5 12h14" />,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>, edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14" /></>, more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>
  };
  return <svg className="slots-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.grid}</svg>;
}
