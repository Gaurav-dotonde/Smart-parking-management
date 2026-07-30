import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  changeCurrentUserPassword,
  deleteCurrentUserPhoto,
  getCurrentUser,
  updateCurrentUser,
  uploadCurrentUserPhoto,
} from '../services/userService';
import { formatDisplayName } from '../utils/formatDisplayName';

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };

function Icon({ name }) {
  const paths = {
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    phone: <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-1-2 2c-4-1.5-7.5-5-9-9l2-2-1-4Z"/>,
    car: <><path d="m5 16-1-3 2-5h12l2 5-1 3"/><path d="M3 16h18v3H3zM7 19v2m10-2v2M7 13h.01M17 13h.01"/></>,
    id: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.7-1.5 1.7-2 3-2s2.3.5 3 2m3-6h3m-3 4h3"/></>,
    shield: <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
    trash: <><path d="M3 6h18M8 6V3h8v3m3 0-1 15H6L5 6m5 4v7m4-7v7"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg className="profile-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Modal({ title, description, icon, onClose, children, danger = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('profile-modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('profile-modal-open');
    };
  }, [onClose]);

  return (
    <div className="profile-modal-backdrop" onMouseDown={onClose} role="presentation">
      <section className={`profile-modal ${danger ? 'profile-modal-danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="profile-modal-close" onClick={onClose} aria-label={`Close ${title}`}><Icon name="close" /></button>
        <header className="profile-modal-header">
          <span className="profile-card-icon"><Icon name={icon} /></span>
          <div><h2 id="profile-modal-title">{title}</h2><p>{description}</p></div>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', vehicleNumber: '' });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [message, setMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoInputRef = useRef(null);
  const [showPasswords, setShowPasswords] = useState({ currentPassword: false, newPassword: false, confirmNewPassword: false });

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((response) => {
        if (!mounted) return;
        const data = response.data || null;
        setProfile(data);
        setEditForm({ name: data?.name || '', email: data?.email || '', phone: data?.phone || '', vehicleNumber: data?.vehicleNumber || '' });
      })
      .catch((error) => mounted && setPageError(error.response?.data?.message || 'Failed to load profile details.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const profileName = formatDisplayName(profile?.name || user?.name, 'User');
  const email = profile?.email || user?.email || 'Not available';
  const accountStatus = profile?.accountStatus || user?.accountStatus || 'ACTIVE';
  const role = profile?.role || user?.role || 'USER';
  const userId = profile?.id || user?.id;
  const initial = useMemo(() => profileName.trim().charAt(0).toUpperCase() || 'U', [profileName]);
  const openEditModal = () => {
    setEditForm({ name: profile?.name || '', email: profile?.email || '', phone: profile?.phone || '', vehicleNumber: profile?.vehicleNumber || '' });
    setModalError('');
    setActiveModal('edit');
  };

  const closeModal = () => {
    if (saving) return;
    setModalError('');
    setActiveModal(null);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setModalError('');
    if (!editForm.name.trim()) return setModalError('Full name is required.');
    if (editForm.name.trim().length > 120) return setModalError('Full name must be 120 characters or fewer.');
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone.trim())) return setModalError('Phone number must contain exactly 10 digits.');
    if (editForm.vehicleNumber.trim().length > 30) return setModalError('Vehicle number must be 30 characters or fewer.');

    setSaving(true);
    try {
      const response = await updateCurrentUser({ name: editForm.name.trim(), phone: editForm.phone.trim(), vehicleNumber: editForm.vehicleNumber.trim() });
      setProfile(response.data || null);
      updateUser({ name: response.data?.name, email: response.data?.email, phone: response.data?.phone, vehicleNumber: response.data?.vehicleNumber });
      setMessage('Profile updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setModalError(error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setModalError('');
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmNewPassword) return setModalError('All password fields are required.');
    if (newPassword.length < 8) return setModalError('New password must be at least 8 characters.');
    if (newPassword === currentPassword) return setModalError('New password must be different from your current password.');
    if (newPassword !== confirmNewPassword) return setModalError('New password and confirm password do not match.');

    setSaving(true);
    try {
      await changeCurrentUserPassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setShowPasswords({ currentPassword: false, newPassword: false, confirmNewPassword: false });
      setMessage('Password updated successfully.');
      setActiveModal(null);
    } catch (error) {
      setModalError(error.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];
    setPageError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPageError('Only PNG, JPG, and WEBP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPageError('Profile photo must be 5 MB or smaller.');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPageError('');
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const response = await uploadCurrentUserPhoto(formData);
      setProfile(response.data);
      updateUser({ profilePhoto: response.data.profilePhoto, profilePhotoUrl: response.data.profilePhoto });
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
      setMessage('Profile photo updated successfully.');
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to update profile photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoSaving(true);
    setPageError('');
    try {
      const response = await deleteCurrentUserPhoto();
      setProfile(response.data);
      updateUser({ profilePhoto: null, profilePhotoUrl: null });
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
      setMessage('Profile photo removed successfully.');
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to remove profile photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) return <div className="profile-page user-page-section"><section className="user-page-card profile-loading">Loading your profile...</section></div>;

  return (
    <div className="profile-page user-page-section">
      {pageError && <div className="profile-page-alert profile-page-alert-error">{pageError}</div>}
      {message && <div className="profile-page-alert profile-page-alert-success" role="status">{message}</div>}

      <section className="user-page-card user-profile-overview-card">
        <div className="user-profile-overview-main">
          <div className="user-profile-overview-avatar" aria-label={`${profileName} avatar`}>
            {photoPreview || profile?.profilePhoto ? (
              <img src={photoPreview || profile.profilePhoto} alt={profileName} />
            ) : initial}
          </div>
          <div className="user-profile-overview-copy">
            <span className="user-profile-overview-eyebrow">Welcome back,</span>
            <h2>{profileName}</h2>
            <p>{email}</p>
            <div className="user-profile-overview-tags">
              <span>{userId ? `#${String(userId).padStart(4, '0')}` : 'User'}</span>
              <span>{role}</span>
              <span>{accountStatus}</span>
            </div>
            <div className="user-profile-overview-actions">
              <button type="button" className="is-edit" onClick={openEditModal}><Icon name="edit" /> Edit Profile</button>
              <button type="button" className="is-password" onClick={() => { setModalError(''); setActiveModal('password'); }}><Icon name="lock" /> Change Password</button>
            </div>
          </div>
        </div>

        <div className="user-profile-photo-card">
          <span>Profile Photo</span>
          <strong>{photoFile?.name || (profile?.profilePhoto ? 'Photo selected' : 'No photo selected')}</strong>
          <p>Upload PNG, JPG, or WEBP image.<br />Recommended size: 400×400 px.</p>
          <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoSelection} hidden />
          <button type="button" className="user-profile-photo-choose" onClick={() => photoInputRef.current?.click()}>↥ &nbsp; Choose Photo</button>
          <div className="user-profile-photo-actions">
            <button type="button" onClick={handlePhotoUpload} disabled={!photoFile || photoSaving}>{photoSaving ? 'Updating...' : 'Update Photo'}</button>
            <button type="button" onClick={handlePhotoRemove} disabled={photoSaving || (!profile?.profilePhoto && !photoPreview)}>Remove Photo</button>
          </div>
        </div>
      </section>

      <section className="user-profile-private-grid">
        <article className="user-page-card user-profile-private-card">
          <div className="user-profile-private-heading">
            <span className="profile-card-icon"><Icon name="user" /></span>
            <div><h3>Profile Information</h3><p>Manage your personal and account information.</p></div>
          </div>
          <div className="user-profile-private-visual is-user"><Icon name="lock" /></div>
          <strong>Information is private</strong>
          <p>Your personal details are hidden for security reasons.</p>
          <button type="button" onClick={openEditModal}><Icon name="eye" /> View / Edit Information</button>
        </article>

        <article className="user-page-card user-profile-private-card">
          <div className="user-profile-private-heading">
            <span className="profile-card-icon"><Icon name="lock" /></span>
            <div><h3>Password &amp; Security</h3><p>Keep your account secure by updating your password.</p></div>
          </div>
          <div className="user-profile-private-visual is-lock"><Icon name="lock" /></div>
          <strong>Secure your account</strong>
          <p>Choose a strong password to protect your account.</p>
          <button type="button" onClick={() => { setModalError(''); setActiveModal('password'); }}><Icon name="lock" /> Change Password</button>
        </article>

        <article className="user-page-card user-profile-private-card">
          <div className="user-profile-private-heading">
            <span className="profile-card-icon"><Icon name="mail" /></span>
            <div><h3>Contact Details</h3><p>Manage your contact details securely.</p></div>
          </div>
          <div className="user-profile-private-visual is-mail"><Icon name="mail" /></div>
          <strong>Information is private</strong>
          <p>Your contact details are hidden for security reasons.</p>
          <button type="button" onClick={openEditModal}><Icon name="eye" /> View / Edit Contact Details</button>
        </article>

        <article className="user-page-card user-profile-private-card is-danger">
          <div className="user-profile-private-heading">
            <span className="profile-card-icon"><Icon name="shield" /></span>
            <div><h3>Account Actions</h3><p>Manage permanent actions for your account.</p></div>
          </div>
          <div className="user-profile-delete-summary">
            <span className="user-profile-delete-icon"><Icon name="trash" /></span>
            <div><strong>Delete Account</strong><p>Permanently delete your account and all associated data. This action cannot be undone.</p></div>
          </div>
          <button type="button" className="is-delete" onClick={() => { setModalError(''); setActiveModal('delete'); }}><Icon name="trash" /> Delete Account</button>
        </article>
      </section>

      {activeModal === 'edit' && (
        <Modal title="Edit Profile" description="Update your personal information below." icon="edit" onClose={closeModal}>
          <form className="profile-modal-form" onSubmit={handleProfileSave} noValidate>
            {modalError && <div className="profile-modal-error" role="alert">{modalError}</div>}
            <label>Full Name<input value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} placeholder="Enter your full name" autoFocus /></label>
            <label>Email Address<input type="email" value={editForm.email} readOnly aria-describedby="email-help" /><small id="email-help">Email is managed by your account and cannot be changed here.</small></label>
            <div className="profile-modal-field-grid">
              <label>Phone Number<input inputMode="numeric" maxLength="10" value={editForm.phone} onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10-digit phone number" /></label>
              <label>Vehicle Number<input maxLength="30" value={editForm.vehicleNumber} onChange={(e) => setEditForm((current) => ({ ...current, vehicleNumber: e.target.value.toUpperCase() }))} placeholder="e.g. MH 12 AB 9090" /></label>
            </div>
            <div className="profile-readonly-strip"><span><small>User ID</small><b>{userId ? `#${userId}` : 'N/A'}</b></span><span><small>Status</small><b>{accountStatus}</b></span><span><small>Role</small><b>{role}</b></span></div>
            <div className="profile-modal-actions"><button type="button" className="btn profile-cancel-button" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
          </form>
        </Modal>
      )}

      {activeModal === 'password' && (
        <Modal title="Change Password" description="Choose a secure password you do not use elsewhere." icon="lock" onClose={closeModal}>
          <form className="profile-modal-form" onSubmit={handlePasswordSave} noValidate>
            {modalError && <div className="profile-modal-error" role="alert">{modalError}</div>}
            {['currentPassword', 'newPassword', 'confirmNewPassword'].map((field) => (
              <label key={field}>{field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                <span className="profile-password-input"><input type={showPasswords[field] ? 'text' : 'password'} value={passwordForm[field]} onChange={(e) => setPasswordForm((current) => ({ ...current, [field]: e.target.value }))} placeholder={field === 'currentPassword' ? 'Enter current password' : field === 'newPassword' ? 'At least 8 characters' : 'Re-enter new password'} autoFocus={field === 'currentPassword'} /><button type="button" onClick={() => setShowPasswords((current) => ({ ...current, [field]: !current[field] }))} aria-label={`${showPasswords[field] ? 'Hide' : 'Show'} ${field === 'currentPassword' ? 'current password' : 'new password'}`}><Icon name="eye" /></button></span>
              </label>
            ))}
            <p className="profile-password-hint">Your new password must contain at least 8 characters and be different from your current password.</p>
            <div className="profile-modal-actions"><button type="button" className="btn profile-cancel-button" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="btn" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button></div>
          </form>
        </Modal>
      )}

      {activeModal === 'delete' && (
        <Modal title="Delete Account?" description="Please review this action carefully before continuing." icon="trash" onClose={closeModal} danger>
          <div className="profile-delete-warning"><strong>This action is permanent</strong><p>Your profile and associated parking data would be permanently removed and could not be recovered.</p></div>
          <div className="profile-modal-error">Self-service account deletion is not currently available for this account. No data will be removed.</div>
          <div className="profile-modal-actions"><button type="button" className="btn profile-cancel-button" onClick={closeModal}>Cancel</button><button type="button" className="profile-delete-outline" disabled>Delete Permanently</button></div>
        </Modal>
      )}
    </div>
  );
}
