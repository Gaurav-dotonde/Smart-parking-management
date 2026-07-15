import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { useAuth } from '../context/AuthContext';

function BrandLogo() {
  return (
    <div className="auth-brand-logo" aria-hidden="true">
      <span className="auth-brand-logo-letter">P</span>
      <svg viewBox="0 0 24 24" className="auth-brand-logo-car">
        <path d="M5.5 14.5L7.2 10.2C7.5 9.45 8.22 9 9.03 9H14.97C15.78 9 16.5 9.45 16.8 10.2L18.5 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 14.5H19.5V17.2C19.5 17.64 19.14 18 18.7 18H17.8C17.36 18 17 17.64 17 17.2V16.8H7V17.2C7 17.64 6.64 18 6.2 18H5.3C4.86 18 4.5 17.64 4.5 17.2V14.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.8 12.3H16.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8.2" cy="15.7" r="0.9" fill="currentColor" />
        <circle cx="15.8" cy="15.7" r="0.9" fill="currentColor" />
      </svg>
    </div>
  );
}

function FieldIcon({ type }) {
  if (type === 'email') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H18.5C19.3284 6 20 6.67157 20 7.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5V7.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 8L12 13L19 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'phone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 4.5H15.5C16.3284 4.5 17 5.17157 17 6V18C17 18.8284 16.3284 19.5 15.5 19.5H8.5C7.67157 19.5 7 18.8284 7 18V6C7 5.17157 7.67157 4.5 8.5 4.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 16.5H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19C5.91242 16.6156 8.29048 15 11 15H13C15.7095 15 18.0876 16.6156 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'car') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.5 14.5L7.2 10.2C7.5 9.45 8.22 9 9.03 9H14.97C15.78 9 16.5 9.45 16.8 10.2L18.5 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 14.5H19.5V17.2C19.5 17.64 19.14 18 18.7 18H5.3C4.86 18 4.5 17.64 4.5 17.2V14.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="8.2" cy="15.7" r="0.9" fill="currentColor" />
        <circle cx="15.8" cy="15.7" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  if (type === 'eye') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.8 12C4.67 8.9 8 7 12 7C16 7 19.33 8.9 21.2 12C19.33 15.1 16 17 12 17C8 17 4.67 15.1 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V8C7 5.79086 8.79086 4 11 4H13C15.2091 4 17 5.79086 17 8V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/user/home', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError('Phone number must be 10 digits.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        vehicleNumber: form.vehicleNumber.trim(),
      });
      setSuccess('Account created successfully. Please login.');
      setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper auth-login-shell">
      <div className="auth-login-layout auth-register-layout">
        <section className="auth-login-hero auth-register-hero">
          <div className="auth-login-hero-overlay" />
          <div className="auth-login-hero-content">
            <div className="auth-login-hero-brand">
              <BrandLogo />
              <div>
                <h1>Smart Parking</h1>
                <p>Create your user account</p>
              </div>
            </div>

            <div className="auth-login-hero-copy">
              <h2>Create Account</h2>
              <h3>Park Smarter, Start Here</h3>
              <span className="auth-login-divider" />
              <p>
                Join Smart Parking to reserve slots, track activity, and manage your parking
                experience from one secure account.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-card auth-login-card auth-register-card">
          <div className="auth-login-form-brand">
            <BrandLogo />
          </div>

          <div className="auth-login-copy">
            <h2>Create Account</h2>
            <span>Register as a normal user to continue</span>
          </div>

          {success && <p className="auth-register-success">{success}</p>}
          {error && <p className="error-text auth-login-error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field-block">
              <label>Full Name</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="user" /></div>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field-block">
              <label>Email Address</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="email" /></div>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field-block">
              <label>Phone Number</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="phone" /></div>
                <input
                  type="tel"
                  required
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field-block">
              <label>Vehicle Number</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="car" /></div>
                <input
                  type="text"
                  placeholder="Optional"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field-block">
              <label>Password</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="password" /></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <FieldIcon type="eye" />
                </button>
              </div>
            </div>

            <div className="auth-field-block">
              <label>Confirm Password</label>
              <div className="auth-input-group">
                <div className="auth-input-icon"><FieldIcon type="password" /></div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <FieldIcon type="eye" />
                </button>
              </div>
            </div>

            <button className="btn auth-login-btn" disabled={loading}>
              <span>{loading ? 'Creating...' : 'Register'}</span>
            </button>
          </form>

          <p className="auth-login-footer">
            Already have an account? <Link className="link" to="/login">Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
