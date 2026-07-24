import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatDisplayName } from '../utils/formatDisplayName';
import {
  blockAdminUser,
  createAdminUser,
  deleteAdminUser,
  getAdminUserById,
  getAdminUsers,
  unblockAdminUser,
  updateAdminUser,
} from '../services/userService';
import { onParkingDataChanged } from '../services/dataSync';
import { unwrapList } from '../services/parkingService';

const summaryCards = [
  { title: 'Total Users', key: 'total', tone: 'blue' },
  { title: 'Active Users', key: 'active', tone: 'green' },
  { title: 'Blocked Users', key: 'blocked', tone: 'red' },
];

function UserStatIcon({ type }) {
  const icons = {
    total: <><circle cx="9" cy="8" r="3.5" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15.5 5.3a3 3 0 0 1 0 5.4M16 14.5c2 .2 3.7 1.5 4.4 3.5" /></>,
    active: <><circle cx="10" cy="8" r="4" /><path d="M3.5 20c.9-3.4 3.3-5 6.5-5 1.2 0 2.3.2 3.2.7m1.3 1.3 2 2 4-5" /></>,
    blocked: <><circle cx="10" cy="7.5" r="3.5" /><path d="M3.5 18.5c.8-3 3-4.5 6.5-4.5 1.1 0 2.1.2 3 .5M15 15l5 5m0-5-5 5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[type]}</svg>;
}

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const emptyForm = { name: '', email: '', phone: '', password: '', role: 'USER', accountStatus: 'ACTIVE' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [blockTarget, setBlockTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [formUserId, setFormUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const usersTableRef = useRef(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUsers();
      setUsers(unwrapList(res.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    return onParkingDataChanged(() => {
      loadUsers();
    });
  }, []);

  const filteredUsers = useMemo(() => (
    users.filter((user) => {
      const term = search.toLowerCase();
      const matchesSearch = !term
        || user.name?.toLowerCase().includes(term)
        || user.email?.toLowerCase().includes(term)
        || user.phone?.toLowerCase().includes(term);

      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || user.accountStatus === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    })
  ), [users, search, roleFilter, statusFilter]);

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.accountStatus === 'ACTIVE').length,
    blocked: users.filter((user) => user.accountStatus === 'BLOCKED').length,
  }), [users]);

  const showSummaryUsers = (key) => {
    setSearch('');
    setRoleFilter('All');
    setStatusFilter(key === 'active' ? 'ACTIVE' : key === 'blocked' ? 'BLOCKED' : 'All');
    window.requestAnimationFrame(() => usersTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleSummaryKeyDown = (event, key) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showSummaryUsers(key);
    }
  };

  const openDetails = async (userId) => {
    setDetailsLoading(true);
    setDetailsError('');
    try {
      const res = await getAdminUserById(userId);
      setSelectedUser(res.data);
    } catch (err) {
      setDetailsError(err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const confirmBlockToggle = async () => {
    if (!blockTarget) return;
    setActionLoading(true);
    try {
      if (blockTarget.accountStatus === 'BLOCKED') {
        await unblockAdminUser(blockTarget.id);
      } else {
        await blockAdminUser(blockTarget.id);
      }
      setBlockTarget(null);
      if (selectedUser?.id === blockTarget.id) {
        setSelectedUser(null);
      }
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedUser?.id === deleteTarget.id) {
        setSelectedUser(null);
      }
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateForm = () => {
    setUserForm(emptyForm);
    setFormUserId(null);
    setFormError('');
    setFormMode('create');
  };

  const openEditForm = (user) => {
    setUserForm({
      name: user.name || '', email: user.email || '', phone: user.phone || '', password: '',
      role: user.role || 'USER', accountStatus: user.accountStatus || 'ACTIVE',
    });
    setFormUserId(user.id);
    setFormError('');
    setFormMode('edit');
  };

  const submitUserForm = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      if (formMode === 'create') await createAdminUser(userForm);
      else await updateAdminUser(formUserId, userForm);
      setFormMode(null);
      await loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container admin-page">
      <div className="admin-compact-page-head admin-module-head">
        <div><span className="admin-module-eyebrow">Account directory</span><h2>User Management</h2><p>Manage registered users, account status, and booking activity.</p></div>
        <button type="button" className="btn" onClick={openCreateForm}>+ Create Account</button>
      </div>

      <div className="dashboard-stats-grid users-stats-grid">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="card dashboard-stat-card"
            role="button"
            tabIndex={0}
            aria-label={`Show ${card.title.toLowerCase()} in users table`}
            onClick={() => showSummaryUsers(card.key)}
            onKeyDown={(event) => handleSummaryKeyDown(event, card.key)}
          >
            <div className={`dashboard-stat-icon admin-user-stat-icon ${card.tone}`}>
              <UserStatIcon type={card.key} />
            </div>
            <div>
              <span className="dashboard-stat-title">{card.title}</span>
              <strong className="dashboard-stat-value">{summary[card.key]}</strong>
            </div>
          </div>
        ))}
      </div>

      <section className="card users-card">
        <div className="dashboard-section-head">
          <h3>Filters</h3>
          <p>Search and filter users by role and account status.</p>
        </div>

        <div className="users-filters">
          <div className="form-group">
            <label>Search by Name, Email, or Phone</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
          </div>
          <div className="form-group">
            <label>Role Filter</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option>All</option>
              <option>USER</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status Filter</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>ACTIVE</option>
              <option>BLOCKED</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card users-card admin-users-table-card" ref={usersTableRef}>
        <div className="dashboard-section-head">
          <div><h3>Users Table</h3><p>View user records and control account-level actions.</p></div>
          <button type="button" className="btn" onClick={openCreateForm}>Create Account</button>
        </div>

        {loading && <div className="empty-state">Loading users...</div>}
        {!loading && error && <div className="error-text">{error}</div>}
        {!loading && !error && !filteredUsers.length && <div className="empty-state">No users found.</div>}

        {!loading && !error && !!filteredUsers.length && (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table admin-users-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Total Bookings</th>
                  <th>Account Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{formatDisplayName(user.name, 'User')}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || 'N/A'}</td>
                    <td>{user.role}</td>
                    <td>{user.totalBookings}</td>
                    <td>
                      <span className={`badge ${user.accountStatus === 'ACTIVE' ? 'badge-active' : 'badge-cancelled'}`}>
                        {user.accountStatus}
                      </span>
                    </td>
                    <td>{formatDate(user.createdDate)}</td>
                    <td>
                      <div className="manage-slots-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => openDetails(user.id)}>
                          View Details
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => openEditForm(user)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn ${user.accountStatus === 'BLOCKED' ? '' : 'btn-danger'}`}
                          disabled={user.role === 'ADMIN' && user.accountStatus !== 'BLOCKED'}
                          onClick={() => setBlockTarget(user)}
                        >
                          {user.accountStatus === 'BLOCKED' ? 'Unblock' : 'Block'}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => setDeleteTarget(user)}>
                          Archive User
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

      {formMode && (
        <div className="modal-backdrop">
          <form className="modal-card user-account-modal" onSubmit={submitUserForm}>
            <div className="dashboard-section-head">
              <h3>{formMode === 'create' ? 'Create Account' : 'Edit Account'}</h3>
              <button type="button" className="modal-close" aria-label="Close account form" onClick={() => setFormMode(null)}>×</button>
            </div>
            <div className="profile-form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input pattern="[0-9]{10}" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{formMode === 'create' ? 'Password' : 'New Password (optional)'}</label>
                <input required={formMode === 'create'} minLength="8" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value="USER" disabled><option value="USER">USER</option></select>
              </div>
              {formMode === 'edit' && (
                <div className="form-group">
                  <label>Status</label>
                  <select value={userForm.accountStatus} onChange={(e) => setUserForm({ ...userForm, accountStatus: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option><option value="BLOCKED">BLOCKED</option><option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
            </div>
            {formError && <div className="error-text">{formError}</div>}
            <div className="manage-slots-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setFormMode(null)} disabled={actionLoading}>Cancel</button>
              <button type="submit" className="btn" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Account'}</button>
            </div>
          </form>
        </div>
      )}

      {(detailsLoading || detailsError || selectedUser) && (
        <div className="modal-backdrop user-details-backdrop">
          <div className="modal-card user-details-modal">
            <div className="dashboard-section-head">
              <div>
                <h3>User Details</h3>
                <p>Account information and recent parking activity.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close user details" onClick={() => { setSelectedUser(null); setDetailsError(''); }}>
                ×
              </button>
            </div>
            {detailsLoading && <div className="empty-state">Loading details...</div>}
            {!detailsLoading && detailsError && <div className="error-text">{detailsError}</div>}
            {!detailsLoading && selectedUser && (
              <>
                <div className="booking-details-grid">
                  <div><strong>Name:</strong> {formatDisplayName(selectedUser.name, 'User')}</div>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</div>
                  <div><strong>Role:</strong> {selectedUser.role}</div>
                  <div><strong>Account Status:</strong> {selectedUser.accountStatus}</div>
                  <div><strong>Total Bookings:</strong> {selectedUser.totalBookings}</div>
                </div>

                <div className="dashboard-section-head details-subhead">
                  <h3>Recent Bookings</h3>
                </div>
                {!selectedUser.recentBookings?.length && <div className="empty-state">No recent bookings.</div>}
                {!!selectedUser.recentBookings?.length && (
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Slot Number</th>
                          <th>Vehicle Number</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.recentBookings.map((booking) => (
                          <tr key={booking.bookingId}>
                            <td>{booking.bookingId}</td>
                            <td>{booking.slotNumber}</td>
                            <td>{booking.vehicleNumber}</td>
                            <td>{formatDate(booking.startTime)}</td>
                            <td>{formatDate(booking.endTime)}</td>
                            <td>{booking.bookingStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {blockTarget && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-card">
            <h3>{blockTarget.accountStatus === 'BLOCKED' ? 'Unblock User' : 'Block User'}</h3>
            <p>
              {blockTarget.accountStatus === 'BLOCKED'
                ? `Are you sure you want to unblock ${formatDisplayName(blockTarget.name, 'this user')}?`
                : `Are you sure you want to block ${formatDisplayName(blockTarget.name, 'this user')}?`}
            </p>
            <div className="manage-slots-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setBlockTarget(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmBlockToggle} disabled={actionLoading}>
                {actionLoading ? 'Updating...' : blockTarget.accountStatus === 'BLOCKED' ? 'Confirm Unblock' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-card">
            <h3>Archive User</h3>
            <p>Archive {formatDisplayName(deleteTarget.name, 'this user')}? Their historical bookings remain intact and the account becomes inactive.</p>
            <div className="manage-slots-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={actionLoading}>
                {actionLoading ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
