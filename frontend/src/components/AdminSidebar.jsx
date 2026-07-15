import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const items = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Manage Lots', to: '/admin/lots', icon: 'slots' },
  { label: 'Manage Slots', to: '/admin/slots', icon: 'slots' },
  { label: 'All Bookings', to: '/admin/bookings', icon: 'bookings' },
  { label: 'Users', to: '/admin/users', icon: 'users' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { label: 'Profile', to: '/admin/profile', icon: 'profile' },
];

function SidebarIcon({ name }) {
  const commonProps = {
    className: 'admin-sidebar-icon',
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
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M8.5 12C10.433 12 12 10.433 12 8.5C12 6.567 10.433 5 8.5 5C6.567 5 5 6.567 5 8.5C5 10.433 6.567 12 8.5 12Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.5 10C17.1569 10 18.5 8.65685 18.5 7C18.5 5.34315 17.1569 4 15.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3.5 18C4.33398 15.8246 6.50444 14.5 9 14.5H10C12.4956 14.5 14.666 15.8246 15.5 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 14.5C18.0024 14.5 19.773 15.5843 20.7 17.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...commonProps}>
          <path d="M7 18V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 18V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17 18V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 19.25H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export default function AdminSidebar() {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span>SMART PARKING</span>
        <strong>Admin Panel</strong>
      </div>

      <nav className="admin-sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
            end={item.to === '/admin/dashboard'}
          >
            <SidebarIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button type="button" className="btn admin-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
