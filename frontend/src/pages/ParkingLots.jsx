import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveLots, unwrapList } from '../services/parkingService';

export default function ParkingLots() {
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getActiveLots()
      .then((res) => setLots(unwrapList(res.data)))
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load parking lots.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = lots.filter((lot) =>
    `${lot.name}${lot.location}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <h2 className="page-title">Find Parking</h2>
      <p className="subtitle">Choose a parking lot to view live slot availability</p>

      <input
        placeholder="Search by name or location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: '10px 14px', width: '100%', maxWidth: 360, borderRadius: 8, border: '1px solid #d1d5db' }}
      />

      {loading && <p style={{ marginTop: 20 }}>Loading parking lots...</p>}
      {!loading && error && <div className="error-text">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">No parking lots found.</div>
      )}

      <div className="grid">
        {!error && filtered.map((lot) => (
          <div key={lot.id} className="card">
            <h3>{lot.name}</h3>
            <p>Location: {lot.location}</p>
            <p>Total slots: {lot.totalSlots}</p>
            <p>Price: Rs {lot.pricePerHour} / hour</p>
            <p>Open: {lot.openingTime || 'N/A'} - {lot.closingTime || 'N/A'}</p>
            <Link to={`/lots/${lot.id}`}>
              <button className="btn" style={{ marginTop: 10 }}>View Slots</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
