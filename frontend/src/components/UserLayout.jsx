import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';
import { getUserRefunds } from '../services/refundService';

const titles = {
  '/user/dashboard': 'User Dashboard',
  '/user/find-parking': 'Find Parking',
  '/user/available-slots': 'Available Slots',
  '/user/bookings': 'My Bookings',
  '/user/booking-history': 'Booking History',
  '/user/payments': 'Payments',
  '/user/support': 'Support Center',
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
  const [refundNotifications, setRefundNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const userName = formatDisplayName(user?.name, 'User');
  const firstName = userName.split(' ').filter(Boolean)[0] || 'User';

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/user/')) {
      return titles[location.pathname] || 'User Portal';
    }
    return 'User Portal';
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('navigation-drawer-open', mobileOpen);
    return () => document.body.classList.remove('navigation-drawer-open');
  }, [mobileOpen]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRefundNotifications = () => getUserRefunds({ page: 0, size: 8 })
      .then((response) => {
        if (mounted) setRefundNotifications((response.data?.content || []).filter((item) => ['REQUESTED', 'INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(item.refundStatus)));
      })
      .catch(() => { if (mounted) setRefundNotifications([]); });
    loadRefundNotifications();
    const timer = window.setInterval(loadRefundNotifications, 60000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  return (
    <div className="user-shell">
      <button
        type="button"
        className={`user-overlay ${mobileOpen ? 'show' : ''}`}
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <UserSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="user-content">
        <header className="user-topbar">
          <div className="user-topbar-left">
            <button
              type="button"
              className="user-menu-toggle"
              onClick={() => setMobileOpen((current) => !current)}
              aria-label="Toggle user sidebar"
              aria-expanded={mobileOpen}
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

          <div className="user-refund-notifications">
            <button type="button" className="admin-notification-button" aria-label="Refund notifications" onClick={() => setNotificationsOpen((value) => !value)}>
              <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {refundNotifications.length > 0 && <span className="admin-notification-badge">{refundNotifications.length}</span>}
            </button>
            {notificationsOpen && <section className="admin-notification-dropdown user-refund-notification-dropdown">
              <header><div><strong>Refund updates</strong><small>Updates for your refund requests</small></div><button onClick={() => setNotificationsOpen(false)}>Close</button></header>
              <div className="admin-notification-list">
                {!refundNotifications.length ? <p className="admin-notification-state">No refund notifications.</p> : refundNotifications.map((item) => <NavLink key={item.refundId} to="/user/payments?tab=refunds" className="admin-notification-item" onClick={() => setNotificationsOpen(false)}>
                  <span className="admin-notification-icon tone-payment">₹</span>
                  <span><strong>Refund {item.refundStatus.toLowerCase()}</strong><small>{item.refundId} · ₹{Number(item.refundAmount || 0).toFixed(2)}</small><time>{item.processedAt || item.requestedAt ? new Date(item.processedAt || item.requestedAt).toLocaleString() : ''}</time></span><i />
                </NavLink>)}
              </div>
            </section>}
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
