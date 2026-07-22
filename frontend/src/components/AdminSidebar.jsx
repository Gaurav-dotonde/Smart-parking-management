import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const items = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Parking Locations', to: '/admin/lots', icon: 'locations' },
  { label: 'Parking Slots', to: '/admin/slots', icon: 'slots' },
  { label: 'Bookings', to: '/admin/bookings', icon: 'bookings' },
  { label: 'Users', to: '/admin/users', icon: 'users' },
  { label: 'Vehicles', to: '/admin/vehicles', icon: 'vehicles' },
  { label: 'Payments', to: '/admin/payments', icon: 'payments' },
  { label: 'Reports', to: '/admin/reports', icon: 'reports' },
  { label: 'Admin Profile', to: '/admin/profile', icon: 'profile' },
];

function SidebarIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    locations: <><path d="M12 21s7-5.3 7-12a7 7 0 1 0-14 0c0 6.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></>,
    slots: <><path d="M5 18V8.5A3.5 3.5 0 0 1 8.5 5h5a5 5 0 0 1 0 10H9"/><path d="M9 5v14"/></>,
    bookings: <><rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15.5 5.2a3 3 0 0 1 0 5.6M16 14.5c2 .2 3.6 1.6 4.3 3.5"/></>,
    vehicles: <><path d="M4 15V10l2-4h12l2 4v5"/><path d="M3 15h18v3H3zM7 18v2M17 18v2"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/></>,
    payments: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/></>,
    reports: <><path d="M5 20V11M12 20V4M19 20v-6M3 20.5h18"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M5 20c.9-3.2 3.5-5 7-5s6.1 1.8 7 5"/></>,
  };
  return <svg className="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AdminSidebar({ open = false, onClose }) {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`admin-sidebar ${open ? 'is-open' : ''}`} aria-label="Admin navigation">
      <div className="admin-sidebar-brand">
        <span className="admin-brand-mark">P</span>
        <div><strong>Smart Parking</strong><small>Admin Console</small></div>
        <button type="button" className="admin-sidebar-close" aria-label="Close navigation" onClick={onClose}>×</button>
      </div>
      <nav className="admin-sidebar-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`} end={item.to === '/admin/dashboard'}>
            <SidebarIcon name={item.icon} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
