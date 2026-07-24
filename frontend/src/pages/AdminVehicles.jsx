import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAdminUsers } from '../services/userService';
import {
  archiveAdminVehicle,
  createAdminVehicle,
  getAdminVehicles,
  getArchivedAdminVehicles,
  restoreAdminVehicle,
  setAdminVehicleStatus,
  updateAdminVehicle,
} from '../services/vehicleService';

const blank = { ownerId: '', registrationNumber: '', vehicleType: 'CAR', brand: '', model: '', color: '', active: true };
const errorMessage = (error, fallback = 'The vehicle operation failed.') => error.response?.data?.message || fallback;
const BusyLabel = ({ children }) => <><span className="admin-spinner vehicle-action-spinner" aria-hidden="true" />{children}</>;

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [summaryFilter, setSummaryFilter] = useState('ALL');
  const [archivedView, setArchivedView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const tableRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [vehicleRes, userRes] = await Promise.all([
        archivedView ? getArchivedAdminVehicles() : getAdminVehicles(),
        getAdminUsers(),
      ]);
      setVehicles(Array.isArray(vehicleRes.data) ? vehicleRes.data : []);
      setUsers((Array.isArray(userRes.data) ? userRes.data : []).filter((user) => !user.archived));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load vehicles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [archivedView]);
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const visible = useMemo(() => {
    const filtered = vehicles
      .filter((vehicle) => (type === 'ALL' || vehicle.vehicleType === type)
        && (summaryFilter !== 'ACTIVE' || vehicle.active)
        && (!search || `${vehicle.registrationNumber} ${vehicle.ownerName} ${vehicle.ownerEmail}`.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => Number(a.id) - Number(b.id));

    if (summaryFilter !== 'OWNERS') return filtered;
    return [...new Map(filtered.map((vehicle) => [vehicle.ownerId, vehicle])).values()];
  }, [vehicles, search, type, summaryFilter]);

  const showSummaryData = (filter) => {
    setSummaryFilter(filter);
    setSearch('');
    setType('ALL');
    window.requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const summaryKeyboard = (event, filter) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showSummaryData(filter);
    }
  };

  const replaceRow = (updated) => {
    setVehicles((current) => current.map((vehicle) => (vehicle.id === updated.id ? updated : vehicle)));
    setViewing((current) => (current?.id === updated.id ? updated : current));
  };

  const open = (vehicle = null) => {
    setEditing(vehicle);
    setError('');
    setForm(vehicle ? {
      ownerId: vehicle.ownerId,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      active: vehicle.active,
    } : blank);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = editing?.id
        ? await updateAdminVehicle(editing.id, form)
        : await createAdminVehicle(form);
      if (editing?.id) replaceRow(response.data);
      else setVehicles((current) => [...current, response.data]);
      setEditing(null);
      setForm(blank);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    const activate = !statusTarget.active;
    setRunningId(statusTarget.id);
    try {
      const response = await setAdminVehicleStatus(statusTarget.id, activate);
      replaceRow(response.data);
      setStatusTarget(null);
      setMessage({ type: 'success', text: `Vehicle ${activate ? 'activated' : 'deactivated'} successfully.` });
    } catch (statusError) {
      setStatusTarget(null);
      setMessage({ type: 'error', text: errorMessage(statusError, 'Unable to change vehicle status.') });
    } finally {
      setRunningId(null);
    }
  };

  const archive = async () => {
    if (!confirming) return;
    setRunningId(confirming.id);
    try {
      await archiveAdminVehicle(confirming.id);
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== confirming.id));
      setConfirming(null);
      setMessage({ type: 'success', text: 'Vehicle archived successfully.' });
    } catch (archiveError) {
      setConfirming(null);
      setMessage({ type: 'error', text: errorMessage(archiveError, 'Unable to archive vehicle.') });
    } finally {
      setRunningId(null);
    }
  };

  const restore = async () => {
    if (!restoreTarget) return;
    setRunningId(restoreTarget.id);
    try {
      await restoreAdminVehicle(restoreTarget.id);
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== restoreTarget.id));
      setRestoreTarget(null);
      setMessage({ type: 'success', text: 'Vehicle restored successfully.' });
    } catch (restoreError) {
      setRestoreTarget(null);
      setMessage({ type: 'error', text: errorMessage(restoreError, 'Unable to restore vehicle.') });
    } finally {
      setRunningId(null);
    }
  };

  return <div className="container admin-page">
    {message && <div className={`admin-toast ${message.type}`}>{message.text}</div>}
    <div className="admin-compact-page-head admin-module-head">
      <div><span className="admin-module-eyebrow">Vehicle registry</span><h2>Vehicle Management</h2><p>Manage user-owned vehicles linked from bookings.</p></div>
      <div className="admin-head-actions">
        <button className="btn btn-secondary" onClick={() => setArchivedView((current) => !current)}>{archivedView ? 'Active Vehicles' : 'Archived Vehicles'}</button>
        {!archivedView && <button className="btn" onClick={() => open({})}>+ Add Vehicle</button>}
      </div>
    </div>
    <div className="admin-module-stats">
      <article role="button" tabIndex={0} onClick={() => showSummaryData('ALL')} onKeyDown={(event) => summaryKeyboard(event, 'ALL')}><span>{archivedView ? 'Archived Vehicles' : 'All Vehicles'}</span><strong>{vehicles.length}</strong><small>{archivedView ? 'Stored records' : 'Registered records'}</small></article>
      <article role="button" tabIndex={0} className="is-green" onClick={() => showSummaryData('ACTIVE')} onKeyDown={(event) => summaryKeyboard(event, 'ACTIVE')}><span>Active</span><strong>{vehicles.filter((vehicle) => vehicle.active).length}</strong><small>Ready for booking</small></article>
      <article role="button" tabIndex={0} className="is-purple" onClick={() => showSummaryData('OWNERS')} onKeyDown={(event) => summaryKeyboard(event, 'OWNERS')}><span>Vehicle Owners</span><strong>{new Set(vehicles.map((vehicle) => vehicle.ownerId)).size}</strong><small>Linked users</small></article>
    </div>
    <section className="card users-card">
      <div className="users-filters">
        <div className="form-group"><label>Search registration or owner</label><input value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="form-group"><label>Vehicle Type</label><select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All</option>{['TWO_WHEELER', 'CAR'].map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
    </section>
    <section className="card users-card" ref={tableRef}>
      {error && <div className="error-text">{error}</div>}
      {loading ? <div className="empty-state">Loading vehicles...</div> : !visible.length ? <div className="empty-state">{archivedView ? 'No archived vehicles found.' : 'No vehicles found.'}</div> : <div className="dashboard-table-wrap">
        <table className="dashboard-table"><thead><tr><th>ID</th><th>Registration</th><th>Owner</th><th>Type</th><th>Brand / Model</th><th>Color</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{visible.map((vehicle) => <tr key={vehicle.id}>
            <td>{vehicle.id}</td><td><strong>{vehicle.registrationNumber}</strong></td><td>{vehicle.ownerName}<small>{vehicle.ownerEmail}</small></td>
            <td>{vehicle.vehicleType}</td><td>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'N/A'}</td><td>{vehicle.color || 'N/A'}</td>
            <td><span className={`badge ${vehicle.active && !vehicle.archived ? 'badge-active' : 'badge-cancelled'}`}>{vehicle.archived ? 'ARCHIVED' : vehicle.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
            <td><div className="manage-slots-actions">
              <button className="btn btn-secondary" disabled={runningId === vehicle.id} onClick={() => setViewing(vehicle)}>View</button>
              {archivedView
                ? <button className="btn" disabled={runningId === vehicle.id} onClick={() => setRestoreTarget(vehicle)}>{runningId === vehicle.id ? 'Restoring...' : 'Restore'}</button>
                : <>
                  <button className="btn btn-secondary" disabled={runningId === vehicle.id} onClick={() => open(vehicle)}>Edit</button>
                  <button className="btn btn-secondary" disabled={runningId === vehicle.id} onClick={() => setStatusTarget(vehicle)}>{runningId === vehicle.id ? 'Updating...' : vehicle.active ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn btn-danger" disabled={runningId === vehicle.id} onClick={() => setConfirming(vehicle)}>Archive</button>
                </>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    {editing !== null && <div className="modal-backdrop"><form className="modal-card user-account-modal vehicle-account-modal" onSubmit={submit}><div className="dashboard-section-head"><h3>{editing?.id ? 'Edit Vehicle' : 'Add Vehicle'}</h3><button type="button" className="modal-close" aria-label="Close vehicle form" onClick={() => setEditing(null)}>×</button></div><div className="profile-form-grid"><div className="form-group"><label>Owner</label><select required value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}><option value="">Select owner</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div><div className="form-group"><label>Registration Number</label><input required value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} /></div><div className="form-group"><label>Vehicle Type</label><select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}>{['TWO_WHEELER', 'CAR'].map((item) => <option key={item}>{item}</option>)}</select></div>{['brand', 'model', 'color'].map((field) => <div className="form-group" key={field}><label>{field[0].toUpperCase() + field.slice(1)}</label><input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></div>)}</div>{error && <div className="error-text">{error}</div>}<div className="manage-slots-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button><button className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Vehicle'}</button></div></form></div>}
    {viewing && <div className="modal-backdrop vehicle-details-backdrop"><div className="modal-card vehicle-details-modal"><div className="dashboard-section-head"><div><h3>Vehicle Details</h3><p>Registration and owner information.</p></div><button className="modal-close" aria-label="Close vehicle details" onClick={() => setViewing(null)}>×</button></div><div className="booking-details-grid"><div><strong>Registration</strong><span>{viewing.registrationNumber}</span></div><div><strong>Owner</strong><span>{viewing.ownerName}</span></div><div><strong>Email</strong><span>{viewing.ownerEmail}</span></div><div><strong>Type</strong><span>{viewing.vehicleType}</span></div><div><strong>Brand</strong><span>{viewing.brand || 'N/A'}</span></div><div><strong>Model</strong><span>{viewing.model || 'N/A'}</span></div><div><strong>Color</strong><span>{viewing.color || 'N/A'}</span></div></div></div></div>}
    {statusTarget && <div className="modal-backdrop vehicle-confirm-backdrop"><div className="modal-card confirm-card vehicle-confirm-modal"><h3>{statusTarget.active ? 'Deactivate Vehicle?' : 'Activate Vehicle?'}</h3><p>{statusTarget.active ? 'This vehicle will become unavailable for bookings and parking operations.' : 'This vehicle will become available for bookings and parking operations.'}</p><div className="manage-slots-actions"><button className="btn btn-secondary" disabled={runningId !== null} onClick={() => setStatusTarget(null)}>Cancel</button><button className="btn" disabled={runningId !== null} onClick={changeStatus}>{runningId !== null ? <BusyLabel>Updating...</BusyLabel> : statusTarget.active ? 'Deactivate' : 'Activate'}</button></div></div></div>}
    {confirming && <div className="modal-backdrop vehicle-confirm-backdrop"><div className="modal-card confirm-card vehicle-confirm-modal"><h3>Archive Vehicle?</h3><p>Archived vehicles will be removed from the active vehicle list but will remain stored in the database.</p><div className="manage-slots-actions"><button className="btn btn-secondary" disabled={runningId !== null} onClick={() => setConfirming(null)}>Cancel</button><button className="btn btn-danger" disabled={runningId !== null} onClick={archive}>{runningId !== null ? <BusyLabel>Archiving...</BusyLabel> : 'Archive'}</button></div></div></div>}
    {restoreTarget && <div className="modal-backdrop vehicle-confirm-backdrop"><div className="modal-card confirm-card vehicle-confirm-modal"><h3>Restore Vehicle?</h3><p>This vehicle will return to the active vehicle list with its previous status.</p><div className="manage-slots-actions"><button className="btn btn-secondary" disabled={runningId !== null} onClick={() => setRestoreTarget(null)}>Cancel</button><button className="btn" disabled={runningId !== null} onClick={restore}>{runningId !== null ? <BusyLabel>Restoring...</BusyLabel> : 'Restore'}</button></div></div></div>}
  </div>;
}
