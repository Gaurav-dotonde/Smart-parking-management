import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminModal from '../components/AdminModal';
import { archiveLot, createLot, getAllLots, setLotStatus, updateLot, unwrapList } from '../services/parkingService';

const blank = { name: '', address: '', area: '', city: '', state: '', pinCode: '', openingTime: '', closingTime: '', totalSlots: '', pricePerDay: '', active: true };
const input = (form, setForm, name) => ({ value: form[name], onChange: (event) => setForm((current) => ({ ...current, [name]: event.target.value })) });

const normalizeStoredTime = (value) => value ? String(value).slice(0, 5) : '';
const timeParts = (value) => {
  if (!value) return { hour: '', period: 'AM' };
  const [rawHour] = normalizeStoredTime(value).split(':');
  const hour24 = Number(rawHour);
  return { hour: String(hour24 % 12 || 12).padStart(2, '0'), period: hour24 >= 12 ? 'PM' : 'AM' };
};
const to24HourTime = ({ hour, period }) => {
  if (!hour) return '';
  const hour24 = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:00`;
};
const formatTime = (value) => {
  if (!value) return 'N/A';
  const parts = timeParts(value);
  return `${parts.hour}:00 ${parts.period}`;
};

function TwelveHourTimePicker({ label, value, onChange }) {
  const parts = timeParts(value);
  const update = (field, nextValue) => onChange(to24HourTime({ ...parts, [field]: nextValue }));
  return <label className="admin-time-field"><span>{label} *</span><div className="admin-time-picker">
    <select required aria-label={`${label} hour`} value={parts.hour} onChange={(e) => update('hour', e.target.value)}><option value="">Hour</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => <option key={hour}>{hour}</option>)}</select>
    <select required aria-label={`${label} AM or PM`} value={parts.period} onChange={(e) => update('period', e.target.value)}><option>AM</option><option>PM</option></select>
  </div></label>;
}

export default function AdminLots() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => { setLoading(true); try { const lotsResponse = await getAllLots(); setLots(unwrapList(lotsResponse.data)); } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load parking locations.' }); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get('action') === 'add') { setEditing({ mode: 'create' }); setForm(blank); } }, [params]);
  useEffect(() => { if (!message) return undefined; const timer = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(timer); }, [message]);

  const visible = useMemo(() => lots.filter((lot) => {
    const text = `${lot.name} ${lot.address || lot.location} ${lot.area || ''} ${lot.city || ''}`.toLowerCase();
    const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? lot.active && !lot.archived : status === 'INACTIVE' ? !lot.active && !lot.archived : lot.archived);
    return text.includes(search.trim().toLowerCase()) && matchesStatus;
  }), [lots, search, status]);

  const closeForm = () => { setEditing(null); setForm(blank); if (params.has('action')) { params.delete('action'); setParams(params, { replace: true }); } };
  const startEdit = (lot) => { setEditing(lot); setForm({ name: lot.name || '', address: lot.address || lot.location || '', area: lot.area || '', city: lot.city || '', state: lot.state || '', pinCode: lot.pinCode || '', openingTime: lot.openingTime ? `${normalizeStoredTime(lot.openingTime).slice(0, 2)}:00` : '', closingTime: lot.closingTime ? `${normalizeStoredTime(lot.closingTime).slice(0, 2)}:00` : '', totalSlots: lot.totalSlots || '', pricePerDay: lot.pricePerDay ?? '', active: lot.active ?? true }); };

  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      if (form.closingTime && form.openingTime && form.closingTime <= form.openingTime) throw new Error('Closing time must be after opening time.');
      if (!form.openingTime) throw new Error('Opening time is required.');
      if (!form.closingTime) throw new Error('Closing time is required.');
      const payload = { name: form.name.trim(), location: form.address.trim(), address: form.address.trim(), area: form.area, city: form.city, state: form.state, pinCode: form.pinCode, totalSlots: Number(form.totalSlots), pricePerDay: Number(form.pricePerDay), active: form.active, openingTime: form.openingTime, closingTime: form.closingTime };
      if (editing?.mode === 'create') await createLot(payload); else await updateLot(editing.id, payload);
      setMessage({ type: 'success', text: editing?.mode === 'create' ? 'Parking location created.' : 'Parking location updated.' }); closeForm(); await load();
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to save location.' }); }
    finally { setSaving(false); }
  };

  const toggle = async (lot) => { try { await setLotStatus(lot.id, !lot.active); setMessage({ type: 'success', text: `Location ${lot.active ? 'deactivated' : 'activated'}.` }); await load(); } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change location status.' }); } };
  const archive = async () => { if (!confirming) return; setSaving(true); try { await archiveLot(confirming.id); setConfirming(null); setMessage({ type: 'success', text: 'Parking location archived safely.' }); await load(); } catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to archive location.' }); } finally { setSaving(false); } };

  return <div className="admin-module-page">
    {message && <div className={`admin-toast ${message.type}`}>{message.text}</div>}
    <div className="admin-module-head"><div><h2>Parking Locations</h2><p>Manage locations first, then open the slots for one selected location.</p></div><button className="admin-primary-button" onClick={() => { setEditing({ mode: 'create' }); setForm(blank); }}>+ Add New Location</button></div>
    <section className="admin-toolbar"><label><span>Search locations</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, address, area or city" /></label><label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option><option>ACTIVE</option><option>INACTIVE</option><option>ARCHIVED</option></select></label></section>
    <section className="admin-data-card">
      {loading ? <div className="admin-empty-compact"><span className="admin-spinner" /> Loading parking locations…</div> : !visible.length ? <div className="admin-empty-compact">No parking locations match the selected filters.</div> : <div className="admin-responsive-table"><table><thead><tr><th>Location</th><th>Address</th><th>Total Floors</th><th>Total Slots</th><th>Available</th><th>Occupied</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((lot) => <tr key={lot.id}><td><strong>{lot.name}</strong><small>{[lot.area, lot.city].filter(Boolean).join(', ') || 'Area not specified'}</small></td><td>{lot.address || lot.location}<small>{[lot.state, lot.pinCode].filter(Boolean).join(' ')}</small></td><td>{lot.totalFloors ?? 0} Floors</td><td>{lot.totalSlots ?? 0}</td><td>{lot.availableSlots ?? 0}</td><td>{lot.occupiedSlots ?? 0}</td><td><span className={`admin-status ${lot.archived ? 'maintenance' : lot.active ? 'active' : 'disabled'}`}>{lot.status || (lot.archived ? 'ARCHIVED' : lot.active ? 'ACTIVE' : 'INACTIVE')}</span></td><td><div className="admin-row-actions"><button onClick={() => navigate(`/admin/slots?locationId=${lot.id}`)}>View Slots</button><button onClick={() => startEdit(lot)} disabled={lot.archived}>Edit</button><button className="danger" onClick={() => setConfirming(lot)} disabled={lot.archived}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>

    <AdminModal open={Boolean(editing)} title={editing?.mode === 'create' ? 'Add Parking Location' : 'Edit Parking Location'} subtitle="Fields marked with * are required." onClose={saving ? undefined : closeForm} size="large"><form className="admin-form-grid" onSubmit={submit}>
      <label><span>Location Name *</span><input required {...input(form, setForm, 'name')} /></label><label className="span-2"><span>Address *</span><input required {...input(form, setForm, 'address')} /></label>
      <label><span>Area</span><input {...input(form, setForm, 'area')} /></label><label><span>City *</span><input required {...input(form, setForm, 'city')} /></label><label><span>State</span><input {...input(form, setForm, 'state')} /></label><label><span>Pin Code</span><input pattern="[0-9]{6}" {...input(form, setForm, 'pinCode')} /></label>
      <TwelveHourTimePicker label="Opening Time" value={form.openingTime} onChange={(openingTime) => setForm((current) => ({ ...current, openingTime }))} /><TwelveHourTimePicker label="Closing Time" value={form.closingTime} onChange={(closingTime) => setForm((current) => ({ ...current, closingTime }))} />
      <label><span>Total Capacity *</span><input required min="1" max="10000" step="1" inputMode="numeric" type="number" value={form.totalSlots} onKeyDown={(event) => { if (['.', ',', '-', '+', 'e', 'E'].includes(event.key)) event.preventDefault(); }} onChange={(event) => { const value = event.target.value; if (value === '' || /^\d+$/.test(value)) setForm((current) => ({ ...current, totalSlots: value })); }} /><small>Slots and floors are generated automatically.</small></label><label><span>Price Per Day *</span><input required min="0.01" step="0.01" type="number" {...input(form, setForm, 'pricePerDay')} /></label>
      <label><span>Status</span><select value={form.active ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setForm((current) => ({ ...current, active: e.target.value === 'ACTIVE' }))}><option>ACTIVE</option><option>INACTIVE</option></select></label>
      <div className="admin-form-actions span-2"><button type="button" className="admin-secondary-button" onClick={closeForm} disabled={saving}>Cancel</button><button className="admin-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save Location'}</button></div>
    </form></AdminModal>

    <AdminModal open={Boolean(viewing)} title={viewing?.name || 'Parking Location'} subtitle="Parking location details" onClose={() => setViewing(null)}><div className="admin-details-grid"><div className="span-2"><span>Address</span><strong>{viewing?.address || viewing?.location}</strong><small>{[viewing?.area, viewing?.city, viewing?.state, viewing?.pinCode].filter(Boolean).join(', ')}</small></div><div><span>Capacity</span><strong>{viewing?.totalSlots || 0} slots</strong></div><div><span>Price Per Day</span><strong>₹{Number(viewing?.pricePerDay || 0).toFixed(2)}</strong></div><div><span>Operating Hours</span><strong>{formatTime(viewing?.openingTime)} – {formatTime(viewing?.closingTime)}</strong></div><div><span>Status</span><strong>{viewing?.archived ? 'ARCHIVED' : viewing?.active ? 'ACTIVE' : 'INACTIVE'}</strong></div></div></AdminModal>

    <AdminModal open={Boolean(confirming)} title="Archive parking location?" subtitle="This keeps historical bookings intact and removes the location from user availability." onClose={() => !saving && setConfirming(null)}><div className="admin-confirm-copy"><p><strong>{confirming?.name}</strong> will be marked inactive and archived. It will not be physically deleted.</p><div className="admin-form-actions"><button className="admin-secondary-button" onClick={() => setConfirming(null)}>Cancel</button><button className="admin-danger-button" onClick={archive} disabled={saving}>{saving ? 'Archiving…' : 'Archive Location'}</button></div></div></AdminModal>
  </div>;
}
