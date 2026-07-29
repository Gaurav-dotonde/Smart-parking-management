import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const items = [
  { label: 'Dashboard', to: '/user/dashboard', icon: 'dashboard' },
  { label: 'Available Slots', to: '/user/available-slots', icon: 'slots' },
  { label: 'My Bookings', to: '/user/bookings', icon: 'bookings' },
  { label: 'Booking History', to: '/user/booking-history', icon: 'history' },
  { label: 'Payments', to: '/user/payments', icon: 'payments' },
  { label: 'Support', to: '/user/support', icon: 'support' },
  { label: 'Profile', to: '/user/profile', icon: 'profile' },
];

function UserIcon({ name }) {
  const commonProps = {
    className: 'user-sidebar-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 8.5H10.5V12H7V8.5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 8.5H17V15.5H13.5V8.5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 14.5H10.5V17H7V14.5Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'search':
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.2 15.2L19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'slots':
      return (
        <svg {...commonProps}>
          <path d="M4 8.5C4 7.11929 5.11929 6 6.5 6H9.5L11 8H17.5C18.8807 8 20 9.11929 20 10.5V16.5C20 17.8807 18.8807 19 17.5 19H6.5C5.11929 19 4 17.8807 4 16.5V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'bookings':
      return (
        <svg {...commonProps}>
          <path d="M7 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 4.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10.5H20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'history':
      return (
        <svg {...commonProps}>
          <path d="M12 7V12L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C8.829 19.5 6.11707 17.561 5 14.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'payments':
      return (
        <svg {...commonProps}>
          <rect x="4" y="7" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10H20" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 14H11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'support':
      return (
        <svg {...commonProps}>
          <path d="M12 18.5c4.1421 0 7.5-2.91 7.5-6.5S16.1421 5.5 12 5.5 4.5 8.41 4.5 12c0 1.67.84 3.2 2.25 4.35V20l3.08-1.54c.67.2 1.38.3 2.17.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.25 11.2a2.75 2.75 0 1 1 3.9 2.5V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.1" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...commonProps}>
          <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 19C5.91242 16.6156 8.29048 15 11 15H13C15.7095 15 18.0876 16.6156 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function UserAvatar({ name }) {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return <div className="user-avatar">{initials || 'U'}</div>;
}

export default function UserSidebar({ open = false, onClose }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const userName = user?.name || 'User';

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
    if (onClose) onClose();
  };

  const handleNavigate = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`user-sidebar ${open ? 'is-open' : ''}`} aria-label="User navigation">
      <div className="user-sidebar-brand">
        <div className="user-sidebar-brand-badge">P</div>
        <div>
          <span>SMART PARKING</span>
          <strong>User Portal</strong>
        </div>
        <button type="button" className="user-sidebar-close" aria-label="Close navigation" onClick={onClose}>×</button>
      </div>

      <nav className="user-sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `user-sidebar-link ${isActive ? 'active' : ''}`}
            onClick={handleNavigate}
          >
            <UserIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="user-sidebar-footer">
        <button type="button" className="btn user-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
