import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';

const titles = {
  '/user/dashboard': 'User Dashboard',
  '/user/find-parking': 'Find Parking',
  '/user/available-slots': 'Available Slots',
  '/user/bookings': 'My Bookings',
  '/user/booking-history': 'Booking History',
  '/user/payments': 'Payments',
  '/user/profile': 'Profile',
  '/user/home': 'User Dashboard',
};

function Avatar({ name }) {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return <div className="user-topbar-avatar">{initials || 'U'}</div>;
}

export default function UserLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const userName = formatDisplayName(user?.name, 'User');
  const firstName = userName.split(' ').filter(Boolean)[0] || 'User';

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/user/')) {
      return titles[location.pathname] || 'User Portal';
    }
    return 'User Portal';
  }, [location.pathname]);

  return (
    <div className="user-shell">
      <div className={`user-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
      <UserSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="user-content">
        <header className="user-topbar">
          <div className="user-topbar-left">
            <button
              type="button"
              className="user-menu-toggle"
              onClick={() => setMobileOpen((current) => !current)}
              aria-label="Toggle user sidebar"
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h1>{pageTitle}</h1>
              <p>{pageTitle === 'User Dashboard' ? `Welcome back, ${firstName}` : 'Smart Parking User Portal'}</p>
            </div>
          </div>

          <NavLink to="/user/profile" className="user-topbar-user">
            <Avatar name={userName} />
            <div className="user-topbar-user-copy">
              <strong>{userName}</strong>
            </div>
          </NavLink>
        </header>

        <section className="user-page-wrap">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
