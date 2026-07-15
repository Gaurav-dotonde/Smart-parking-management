import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
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

  if (type === 'eye') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.8 12C4.67 8.9 8 7 12 7C16 7 19.33 8.9 21.2 12C19.33 15.1 16 17 12 17C8 17 4.67 15.1 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.8" fill="currentColor" />
        <rect x="13" y="4" width="7" height="7" rx="1.8" fill="currentColor" opacity="0.9" />
        <rect x="4" y="13" width="7" height="7" rx="1.8" fill="currentColor" opacity="0.82" />
        <rect x="13" y="13" width="7" height="7" rx="1.8" fill="currentColor" opacity="0.68" />
      </svg>
    );
  }

  if (type === 'booking') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4.8V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 4.8V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="4" y="6.5" width="16" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === 'reports') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 18V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 18V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17.5 18V13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 19.2H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.8L18.5 6.3V11.2C18.5 15.08 15.95 18.59 12 20.2C8.05 18.59 5.5 15.08 5.5 11.2V6.3L12 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.6 11.9L11.2 13.5L14.8 9.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

const featureItems = [
  { icon: 'dashboard', title: 'Real-time Dashboard', text: 'Monitor all parking activities live' },
  { icon: 'password', title: 'Slot Management', text: 'Manage slots, floors and availability' },
  { icon: 'booking', title: 'Booking Management', text: 'Track and manage all bookings' },
  { icon: 'reports', title: 'Reports & Analytics', text: 'Get insights with powerful reports' },
];

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, loginUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    navigate('/user/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await login({
        email: form.email.trim(),
        password: form.password,
      });
      loginUser(res.data);
      navigate(res.data.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper auth-login-shell">
      <div className="auth-login-layout">
        <section className="auth-login-hero">
          <div className="auth-login-hero-overlay" />
          <div className="auth-login-hero-content">
            <div className="auth-login-hero-brand">
              <BrandLogo />
              <div>
                <h1>Smart Parking</h1>
                <p>Intelligent Parking Management System</p>
              </div>
            </div>

            <div className="auth-login-hero-copy">
              <h2>Smarter Parking</h2>
              <h3>Better Management</h3>
              <span className="auth-login-divider" />
              <p>
                Manage parking slots, monitor bookings, generate reports, and streamline operations
                from one powerful dashboard.
              </p>
            </div>

            <div className="auth-login-features">
              {featureItems.map((item) => (
                <div key={item.title} className="auth-login-feature">
                  <div className="auth-login-feature-icon">
                    <FieldIcon type={item.icon} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="auth-login-security-card">
              <div className="auth-login-security-icon">
                <FieldIcon type="shield" />
              </div>
              <div>
                <strong>Secure. Reliable. Efficient.</strong>
                <p>Smart Parking for a smarter tomorrow.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card auth-login-card">
          <div className="auth-login-form-brand">
            <BrandLogo />
          </div>

          <div className="auth-login-copy">
            <h2>Welcome Back</h2>
            <span>Sign in to continue to the admin dashboard</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field-block">
              <label>Email Address</label>
              <div className="auth-input-group">
                <div className="auth-input-icon">
                  <FieldIcon type="email" />
                </div>
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
              <label>Password</label>
              <div className="auth-input-group">
                <div className="auth-input-icon">
                  <FieldIcon type="password" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
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

            <div className="auth-login-row">
              <label className="auth-remember">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>
              <span className="auth-forgot">Admin and User Login</span>
            </div>

            {error && <p className="error-text auth-login-error">{error}</p>}

            <button className="btn auth-login-btn" disabled={loading}>
              <FieldIcon type="password" />
              <span>{loading ? 'Logging in...' : 'Login'}</span>
            </button>
          </form>

          <div className="auth-login-or">
            <span />
            <strong>or</strong>
            <span />
          </div>

          <p className="auth-login-footer">
            Don't have an account? <Link className="link" to="/register">Register</Link>
          </p>
        </section>
      </div>

    </div>
  );
}
