import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';

const routeTitles = {
  '/admin/dashboard': ['Dashboard', 'Monitor parking operations and recent activity.'],
  '/admin/lots': ['Parking Locations', 'Manage parking locations, capacity, pricing and operating hours.'],
  '/admin/slots': ['Parking Slots', 'Add, organize and monitor parking slots across all locations.'],
  '/admin/bookings': ['Bookings', 'Review and manage parking bookings.'],
  '/admin/users': ['Users', 'Manage registered users and account access.'],
  '/admin/vehicles': ['Vehicles', 'Manage registered vehicles and their owners.'],
  '/admin/payments': ['Payments', 'Review payment records, verification and refunds.'],
  '/admin/reports': ['Reports', 'Review operational and booking insights.'],
  '/admin/profile': ['Admin Profile', 'Manage your administrator account and security.'],
};

export default function AdminLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [title, subtitle] = routeTitles[location.pathname] || ['Admin', 'Smart Parking Management'];
  const adminName = formatDisplayName(user?.name, 'Administrator');
  const initial = adminName.charAt(0).toUpperCase();

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <button
        type="button"
        className={`admin-sidebar-overlay ${sidebarOpen ? 'is-visible' : ''}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title-wrap">
            <button
              type="button"
              className="admin-menu-toggle"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button type="button" className="admin-notification-button" aria-label="Notifications">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
            </button>
            <div className="admin-profile-menu" ref={menuRef}>
              <button
                type="button"
                className="admin-profile-trigger"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="admin-avatar">{initial}</span>
                <span className="admin-profile-copy">
                  <strong>{adminName}</strong>
                  <small>Administrator</small>
                </span>
                <span className="admin-profile-chevron" aria-hidden="true">⌄</span>
              </button>
              {profileOpen && (
                <div className="admin-profile-dropdown" role="menu">
                  <Link to="/admin/profile" role="menuitem">Admin Profile</Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
