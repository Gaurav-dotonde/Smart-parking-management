import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyBookings } from '../services/bookingService';
import { getCurrentUser, updateCurrentUser, changeCurrentUserPassword } from '../services/userService';
import { formatDisplayName } from '../utils/formatDisplayName';

function OverviewCard({ label, value, subtext, icon }) {
  return (
    <article className="profile-overview-card">
      <div className="profile-overview-icon">{icon}</div>
      <div>
        <span className="profile-overview-label">{label}</span>
        <strong className="profile-overview-value">{value}</strong>
        <span className="profile-overview-subtext">{subtext}</span>
      </div>
    </article>
  );
}

function SectionTitle({ title, icon, action }) {
  return (
    <div className="profile-section-title">
      <div className="profile-section-title-left">
        <span className="profile-section-title-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      {action}
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [editForm, setEditForm] = useState({ name: '', phone: '', vehicleNumber: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');
    Promise.all([getCurrentUser(), getMyBookings()])
      .then(([profileRes, bookingsRes]) => {
        if (!mounted) return;
        setProfile(profileRes.data || null);
        setEditForm({
          name: profileRes.data?.name || '',
          phone: profileRes.data?.phone || '',
          vehicleNumber: profileRes.data?.vehicleNumber || '',
        });
        setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load profile summary.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const profileName = formatDisplayName(profile?.name || user?.name, 'User');
  const initials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const accountStatus = profile?.accountStatus || user?.accountStatus || 'ACTIVE';
  const role = profile?.role || user?.role || 'USER';
  const totalBookings = bookings.length;
  const totalSpent = bookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);

  const fields = [
    { label: 'Full Name', value: profileName },
    { label: 'Email Address', value: profile?.email || user?.email || 'Not available' },
    { label: 'Phone Number', value: profile?.phone || user?.phone || 'Not available yet' },
    { label: 'Vehicle Number', value: profile?.vehicleNumber || user?.vehicleNumber || 'Not available yet' },
    { label: 'User ID', value: profile?.id ? `#${profile.id}` : user?.id ? `#${user.id}` : 'Not available' },
    { label: 'Account Status', value: accountStatus },
    { label: 'Role', value: role },
  ];

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaveMessage('');
    if (!editForm.name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone.trim())) {
      setError('Phone number must be 10 digits.');
      return;
    }
    if (editForm.vehicleNumber && editForm.vehicleNumber.trim().length > 30) {
      setError('Vehicle number must be 30 characters or fewer.');
      return;
    }
    try {
      const res = await updateCurrentUser(editForm);
      setProfile(res.data || null);
      setSaveMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaveMessage('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    try {
      await changeCurrentUserPassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setSaveMessage('Password updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    }
  };

  return (
    <div className="profile-page user-page-section">
      <section className="user-page-card profile-hero">
        <div className="profile-hero-left">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials || 'U'}</div>
          </div>
          <div className="profile-hero-copy">
            <div className="profile-name-row">
              <h2>{profileName}</h2>
              <span className={`profile-verified ${accountStatus === 'ACTIVE' ? '' : 'is-blocked'}`}>{accountStatus}</span>
            </div>
            <div className="profile-contact-item">{profile?.email || user?.email || 'Not available'}</div>
            <div className="profile-contact-item">{role}</div>
            <div className="profile-contact-item">{profile?.id ? `User ID: #${profile.id}` : user?.id ? `User ID: #${user.id}` : 'User ID not available'}</div>
          </div>
        </div>

        <div className="profile-overview-grid">
          <OverviewCard label="Total Bookings" value={loading ? '...' : totalBookings} subtext="All bookings" icon="📘" />
          <OverviewCard label="Total Spent" value={loading ? '...' : formatCurrency(totalSpent)} subtext="From booking records" icon="💳" />
          <OverviewCard label="Account Status" value={accountStatus} subtext="Current status" icon="🛡" />
          <OverviewCard label="Role" value={role} subtext="Signed-in account" icon="👤" />
        </div>
      </section>

      <section className="user-page-card profile-tabs-card">
        <div className="profile-tabs">
          <button type="button" className="profile-tab active">Personal Information</button>
          <button type="button" className="profile-tab">Security</button>
        </div>
      </section>

      <section className="profile-content-grid">
        <div className="user-page-card profile-info-card">
          <SectionTitle title="Personal Information" icon="🧾" />

          {error && <p className="error-text">{error}</p>}
          {saveMessage && <p className="success-text">{saveMessage}</p>}

          <form className="profile-form-grid" onSubmit={handleProfileSave}>
            {fields.map((field) => (
              <div key={field.label} className={`form-group ${field.label === 'Full Name' || field.label === 'Email Address' ? '' : ''}`}>
                <label>{field.label}</label>
                <input
                  type="text"
                  value={
                    field.label === 'Full Name'
                      ? editForm.name
                      : field.label === 'Phone Number'
                        ? editForm.phone
                        : field.label === 'Vehicle Number'
                          ? editForm.vehicleNumber
                          : field.value
                  }
                  readOnly={field.label !== 'Full Name' && field.label !== 'Phone Number' && field.label !== 'Vehicle Number'}
                  onChange={
                    field.label === 'Full Name'
                      ? (e) => setEditForm((current) => ({ ...current, name: e.target.value }))
                      : field.label === 'Phone Number'
                        ? (e) => setEditForm((current) => ({ ...current, phone: e.target.value }))
                        : field.label === 'Vehicle Number'
                          ? (e) => setEditForm((current) => ({ ...current, vehicleNumber: e.target.value }))
                          : undefined
                  }
                />
              </div>
            ))}
            <button type="submit" className="btn profile-password-btn">Update Profile</button>
          </form>

          <div className="profile-info-note">
            Profile details are limited to the data currently available in your account. Additional contact fields can be added later from the profile editor.
          </div>
        </div>

        <div className="profile-right-column">
          <div className="user-page-card profile-password-card">
            <SectionTitle title="Change Password" icon="🔒" />
            <form className="profile-password-grid" onSubmit={handlePasswordSave}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="Enter new password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" value={passwordForm.confirmNewPassword} onChange={(e) => setPasswordForm((current) => ({ ...current, confirmNewPassword: e.target.value }))} />
              </div>
              <button type="submit" className="btn profile-password-btn">
                Update Password
              </button>
            </form>
          </div>

          <div className="user-page-card profile-actions-card">
            <SectionTitle title="Account Actions" icon="🗑" />
            <div className="profile-delete-row">
              <div>
                <strong>Delete Account</strong>
                <p>Deleting your account removes access to your user profile and parking data.</p>
              </div>
              <button type="button" className="btn btn-danger profile-delete-btn">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
