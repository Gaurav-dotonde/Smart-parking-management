import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createLot, getAllLots, updateLot, unwrapList } from '../services/parkingService';
import { onParkingDataChanged } from '../services/dataSync';

const initialForm = {
  name: '',
  location: '',
  totalSlots: '',
  pricePerHour: '',
  active: true,
  openingTime: '',
  closingTime: '',
};

const normalizeForm = (form) => ({
  name: form.name.trim(),
  location: form.location.trim(),
  totalSlots: Number(form.totalSlots),
  pricePerHour: Number(form.pricePerHour),
  active: Boolean(form.active),
  openingTime: form.openingTime || null,
  closingTime: form.closingTime || null,
});

export default function AdminLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editingLot, setEditingLot] = useState(null);
  const [form, setForm] = useState(initialForm);
  const savingRef = useRef(false);

  const loadLots = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllLots();
      setLots(unwrapList(res.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load parking lots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
    return onParkingDataChanged(() => {
      loadLots();
    });
  }, []);

  const filteredLots = useMemo(() => (
    lots.filter((lot) => `${lot.name}${lot.location}`.toLowerCase().includes(search.toLowerCase()))
  ), [lots, search]);

  const resetForm = () => {
    setEditingLot(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = normalizeForm(form);
      if (!payload.name || !payload.location || !payload.totalSlots || !payload.pricePerHour) {
        throw new Error('Please fill all required parking lot fields.');
      }

      if (editingLot) {
        await updateLot(editingLot.id, payload);
      } else {
        await createLot(payload);
      }
      await loadLots();
      resetForm();
      setSuccess(editingLot ? 'Parking lot updated successfully.' : 'Parking lot created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save parking lot.');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleEdit = (lot) => {
    setEditingLot(lot);
    setForm({
      name: lot.name || '',
      location: lot.location || '',
      totalSlots: lot.totalSlots || '',
      pricePerHour: lot.pricePerHour || '',
      active: lot.active ?? true,
      openingTime: lot.openingTime || '',
      closingTime: lot.closingTime || '',
    });
  };

  return (
    <div className="container admin-page">
      <div className="manage-slots-head">
        <div>
          <h2 className="page-title">Manage Parking Lots</h2>
          <p className="subtitle">Create and update live parking lot records used by users.</p>
        </div>
      </div>

      <section className="card manage-slots-card">
        <div className="dashboard-section-head">
          <h3>{editingLot ? 'Edit Parking Lot' : 'Add Parking Lot'}</h3>
          <p>All changes are saved to the shared backend and visible in user pages.</p>
        </div>

        <form className="manage-slots-filters" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Lot Name</label>
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Total Slots</label>
            <input type="number" min="1" value={form.totalSlots} onChange={(e) => setForm((current) => ({ ...current, totalSlots: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Price / Hour</label>
            <input type="number" min="1" step="0.01" value={form.pricePerHour} onChange={(e) => setForm((current) => ({ ...current, pricePerHour: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Opening Time</label>
            <input type="time" value={form.openingTime} onChange={(e) => setForm((current) => ({ ...current, openingTime: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Closing Time</label>
            <input type="time" value={form.closingTime} onChange={(e) => setForm((current) => ({ ...current, closingTime: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.active ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setForm((current) => ({ ...current, active: e.target.value === 'ACTIVE' }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="manage-slots-actions">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : editingLot ? 'Update Lot' : 'Create Lot'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>

        {error && <div className="error-text">{error}</div>}
        {success && <div className="success-text">{success}</div>}
      </section>

      <section className="card manage-slots-card">
        <div className="dashboard-section-head">
          <h3>Parking Lots</h3>
          <p>Search the shared lot records used across Admin and User modules.</p>
        </div>

        <div className="manage-slots-filters">
          <div className="form-group">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or location" />
          </div>
        </div>

        {loading && <div className="empty-state">Loading parking lots...</div>}
        {!loading && !filteredLots.length && <div className="empty-state">No parking lots found.</div>}

        {!loading && !!filteredLots.length && (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Total Slots</th>
                  <th>Price / Hour</th>
                  <th>Opening</th>
                  <th>Closing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map((lot) => (
                  <tr key={lot.id}>
                    <td>{lot.name}</td>
                    <td>{lot.location}</td>
                    <td>{lot.totalSlots}</td>
                    <td>Rs {lot.pricePerHour}</td>
                    <td>{lot.openingTime || 'N/A'}</td>
                    <td>{lot.closingTime || 'N/A'}</td>
                    <td>{lot.active ? 'ACTIVE' : 'INACTIVE'}</td>
                    <td>
                      <div className="manage-slots-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => handleEdit(lot)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
