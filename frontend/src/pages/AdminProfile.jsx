import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  changeAdminPassword,
  deleteAdminProfilePhoto,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfilePhoto,
} from '../services/userService';
import { formatDisplayName } from '../utils/formatDisplayName';

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

const formatDateTime = (value) => {
  if (!value) return 'Not available yet';
  return new Date(value).toLocaleString();
};

const getPhotoUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return value;
};

function EditProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-profile-action-icon" aria-hidden="true">
      <path d="M12 20H5.5C4.67 20 4 19.33 4 18.5V5.5C4 4.67 4.67 4 5.5 4H13.5L20 10.5V18.5C20 19.33 19.33 20 18.5 20H17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 4V10.5H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 16L9.4 15.7L16.8 8.3C17.2 7.9 17.2 7.2 16.8 6.8C16.4 6.4 15.7 6.4 15.3 6.8L7.9 14.2L7.6 15.6L8 16Z" fill="currentColor" />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-profile-action-icon" aria-hidden="true">
      <path d="M7 10V8.5C7 5.46 9.46 3 12.5 3C15.54 3 18 5.46 18 8.5V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="10" width="15" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12.5 14.25V16.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12.5" cy="14.25" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function AdminProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [photoMessage, setPhotoMessage] = useState('');
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  const photoInputRef = useRef(null);

  const loadProfile = async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await getAdminProfile();
      setProfile(res.data);
      updateUser({
        name: res.data.name,
        role: res.data.role,
        accountStatus: res.data.status,
        profilePhoto: res.data.profilePhotoUrl || null,
        profilePhotoUrl: res.data.profilePhotoUrl || null,
      });
      setEditForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
      });
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load admin profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
  }, [photoPreview]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    setPageError('');
    setSubmittingProfile(true);
    try {
      const res = await updateAdminProfile(editForm);
      setProfile(res.data);
      updateUser({
        name: res.data.name,
        role: res.data.role,
        accountStatus: res.data.status,
        profilePhoto: res.data.profilePhotoUrl || null,
        profilePhotoUrl: res.data.profilePhotoUrl || null,
      });
      setProfileMessage('Profile updated successfully.');
      setIsEditModalOpen(false);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPageError('');
    setSubmittingPassword(true);
    try {
      const res = await changeAdminPassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setPasswordMessage(res.data.message || 'Password updated successfully.');
      setIsPasswordModalOpen(false);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handlePhotoSelection = (e) => {
    const file = e.target.files?.[0];
    setPhotoMessage('');
    setPageError('');

    if (!file) {
      setPhotoFile(null);
      setPhotoFileName('');
      setPhotoPreview('');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoFile(null);
      setPhotoFileName('');
      setPhotoPreview('');
      setPageError('Only JPG, JPEG, PNG, and WEBP files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoFile(null);
      setPhotoFileName('');
      setPhotoPreview('');
      setPageError('Profile photo must be 5 MB or smaller.');
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoFileName(file.name);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoButtonClick = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      setPageError('Please choose a photo to upload.');
      return;
    }

    setSubmittingPhoto(true);
    setPhotoMessage('');
    setPageError('');
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const res = await uploadAdminProfilePhoto(formData);
      setProfile(res.data);
      updateUser({
        name: res.data.name,
        role: res.data.role,
        accountStatus: res.data.status,
        profilePhoto: res.data.profilePhotoUrl || null,
        profilePhotoUrl: res.data.profilePhotoUrl || null,
      });
      setPhotoFile(null);
      setPhotoFileName('');
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview('');
      setPhotoMessage('Profile photo updated successfully.');
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setSubmittingPhoto(true);
    setPhotoMessage('');
    setPageError('');
    try {
      const res = await deleteAdminProfilePhoto();
      setProfile(res.data);
      updateUser({
        name: res.data.name,
        role: res.data.role,
        accountStatus: res.data.status,
        profilePhoto: null,
        profilePhotoUrl: null,
      });
      setPhotoFile(null);
      setPhotoFileName('');
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview('');
      setPhotoMessage('Profile photo removed successfully.');
      setConfirmPhotoDelete(false);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to remove profile photo.');
    } finally {
      setSubmittingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="container admin-page">
        <h2 className="page-title">Admin Profile</h2>
        <p className="subtitle">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container admin-page admin-profile-page">
      <div className="admin-profile-hero card">
        <div className="admin-profile-hero-main">
          <div className="admin-profile-avatar-wrap">
            {photoPreview || profile?.profilePhotoUrl ? (
              <img
                src={photoPreview || getPhotoUrl(profile?.profilePhotoUrl)}
                alt={formatDisplayName(profile?.name, 'Admin')}
                className="admin-profile-avatar"
              />
            ) : (
              <div className="admin-profile-avatar admin-profile-avatar-fallback">
                {(profile?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="admin-profile-hero-copy">
            <span className="admin-profile-kicker">Smart Parking Admin</span>
            <h2 className="page-title">Admin Profile</h2>
            <p className="subtitle">Manage your account details, profile photo, and password from one secure place.</p>
            <div className="admin-profile-badges">
              <span className="admin-profile-badge">{profile?.role}</span>
              <span className={`admin-profile-badge ${profile?.status === 'ACTIVE' ? 'is-active' : 'is-blocked'}`}>
                {profile?.status}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-profile-meta-grid">
          <div className="admin-profile-meta-card">
            <span className="admin-profile-meta-label">Email Address</span>
            <strong>{profile?.email}</strong>
          </div>
          <div className="admin-profile-meta-card">
            <span className="admin-profile-meta-label">Phone Number</span>
            <strong>{profile?.phone || 'Not added yet'}</strong>
          </div>
          <div className="admin-profile-meta-card">
            <span className="admin-profile-meta-label">Last Login</span>
            <strong>{formatDateTime(profile?.lastLogin)}</strong>
          </div>
          <div className="admin-profile-meta-card">
            <span className="admin-profile-meta-label">Account Created</span>
            <strong>{formatDateTime(profile?.createdAt)}</strong>
          </div>
        </div>
      </div>

      {pageError && <div className="card error-text admin-profile-alert">{pageError}</div>}
      {profileMessage && <div className="card admin-profile-alert admin-profile-success">{profileMessage}</div>}
      {passwordMessage && <div className="card admin-profile-alert admin-profile-success">{passwordMessage}</div>}
      {photoMessage && <div className="card admin-profile-alert admin-profile-success">{photoMessage}</div>}

      <div className="admin-profile-grid">
        <section className="card admin-profile-card admin-profile-card--wide">
          <div className="admin-profile-section-head">
            <div>
              <h3>Profile Photo</h3>
              <p>Keep your admin account photo compact, clean, and easy to identify.</p>
            </div>
          </div>

          <div className="admin-profile-photo-panel">
            <div className="admin-profile-photo-preview">
              {photoPreview || profile?.profilePhotoUrl ? (
                <img
                  src={photoPreview || getPhotoUrl(profile?.profilePhotoUrl)}
                  alt={formatDisplayName(profile?.name, 'Admin')}
                  className="admin-profile-photo-large"
                />
              ) : (
                <div className="admin-profile-photo-large admin-profile-avatar-fallback">
                  {(profile?.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="admin-profile-photo-actions">
              <div className="admin-profile-upload-row">
                <input
                  ref={photoInputRef}
                  className="admin-profile-file-input"
                  id="admin-profile-photo-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelection}
                />
                <button type="button" className="btn btn-secondary admin-profile-choose-btn" onClick={handlePhotoButtonClick}>
                  Choose Photo
                </button>
                <div className="admin-profile-file-name" title={photoFileName || 'No file chosen'}>
                  {photoFileName || 'No file chosen'}
                </div>
              </div>
              <div className="admin-profile-action-row">
                <p className="admin-profile-helper">Accepted formats: JPG, JPEG, PNG, WEBP. Max size: 5 MB.</p>
                <div className="manage-slots-actions admin-profile-photo-buttons">
                  <button type="button" className="btn" onClick={handlePhotoUpload} disabled={submittingPhoto || !photoFile}>
                    {submittingPhoto ? 'Updating...' : 'Update Photo'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmPhotoDelete(true)}
                    disabled={submittingPhoto || (!profile?.profilePhotoUrl && !photoPreview)}
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card admin-profile-action-card">
          <div className="admin-profile-action-icon-wrap">
            <EditProfileIcon />
          </div>
          <h3>Edit Profile</h3>
          <p>Update your personal account details.</p>
          <button type="button" className="btn" onClick={() => setIsEditModalOpen(true)}>
            Edit Profile
          </button>
        </section>

        <section className="card admin-profile-action-card">
          <div className="admin-profile-action-icon-wrap">
            <PasswordIcon />
          </div>
          <h3>Change Password</h3>
          <p>Update your account password securely.</p>
          <button type="button" className="btn" onClick={() => setIsPasswordModalOpen(true)}>
            Change Password
          </button>
        </section>
      </div>

      {isEditModalOpen && (
        <div className="admin-profile-modal-backdrop" onClick={() => setIsEditModalOpen(false)} role="presentation">
          <div className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-modal-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-profile-modal-close" onClick={() => setIsEditModalOpen(false)} aria-label="Close edit profile modal">
              ×
            </button>
            <div className="admin-profile-modal-head">
              <div className="admin-profile-action-icon-wrap">
                <EditProfileIcon />
              </div>
              <div>
                <h3 id="edit-profile-modal-title">Edit Profile</h3>
                <p>Update only the fields that are editable for the current admin account.</p>
              </div>
            </div>

            <form className="admin-profile-form admin-profile-modal-form" onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="Enter 10-digit phone number"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  minLength={10}
                  pattern="[0-9]{10}"
                  title="Phone number must contain exactly 10 digits"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input value={profile?.email || ''} disabled />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input value={profile?.role || ''} disabled />
              </div>
              <div className="admin-profile-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submittingProfile}>
                  {submittingProfile ? 'Saving...' : 'Edit Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="admin-profile-modal-backdrop" onClick={() => setIsPasswordModalOpen(false)} role="presentation">
          <div className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-modal-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-profile-modal-close" onClick={() => setIsPasswordModalOpen(false)} aria-label="Close change password modal">
              ×
            </button>
            <div className="admin-profile-modal-head">
              <div className="admin-profile-action-icon-wrap">
                <PasswordIcon />
              </div>
              <div>
                <h3 id="change-password-modal-title">Change Password</h3>
                <p>Use your current password to securely set a new one.</p>
              </div>
            </div>

            <form className="admin-profile-form admin-profile-modal-form" onSubmit={handlePasswordSubmit}>
              {['currentPassword', 'newPassword', 'confirmNewPassword'].map((field) => (
                <div className="form-group" key={field}>
                  <label>
                    {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <div className="admin-profile-password-row">
                    <input
                      type={showPasswords[field] ? 'text' : 'password'}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm((current) => ({ ...current, [field]: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary admin-profile-toggle-btn"
                      onClick={() => setShowPasswords((current) => ({ ...current, [field]: !current[field] }))}
                    >
                      {showPasswords[field] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
              <div className="admin-profile-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={submittingPassword}>
                  {submittingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmPhotoDelete && (
        <div className="admin-profile-modal-backdrop" onClick={() => setConfirmPhotoDelete(false)} role="presentation">
          <div
            className="admin-profile-modal admin-profile-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-photo-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-profile-modal-close" onClick={() => setConfirmPhotoDelete(false)} aria-label="Close remove photo modal">
              ×
            </button>
            <div className="admin-profile-modal-head">
              <div className="admin-profile-action-icon-wrap">
                <EditProfileIcon />
              </div>
              <div>
                <h3 id="remove-photo-modal-title">Remove Profile Photo</h3>
                <p>Remove the current administrator profile photo?</p>
              </div>
            </div>
            <div className="admin-profile-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmPhotoDelete(false)} disabled={submittingPhoto}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handlePhotoDelete} disabled={submittingPhoto}>
                {submittingPhoto ? 'Removing...' : 'Remove Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
