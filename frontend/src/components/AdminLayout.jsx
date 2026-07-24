import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';
import { getAdminBookings } from '../services/bookingService';
import { getAdminPayments } from '../services/paymentService';
import { getAdminSupportTickets } from '../services/supportService';
import { onParkingDataChanged } from '../services/dataSync';

const routeTitles = {
  '/admin/dashboard': ['Dashboard', 'Monitor parking operations and recent activity.'],
  '/admin/lots': ['Parking Locations', 'Manage parking locations, capacity, pricing and operating hours.'],
  '/admin/slots': ['Parking Slots', 'Add, organize and monitor parking slots across all locations.'],
  '/admin/bookings': ['Bookings', 'Review and manage parking bookings.'],
  '/admin/users': ['Users', 'Manage registered users and account access.'],
  '/admin/vehicles': ['Vehicles', 'Manage registered vehicles and their owners.'],
  '/admin/payments': ['Payments', 'Review payment records, verification and refunds.'],
  '/admin/support': ['Support Requests', 'Review and resolve user help requests.'],
  '/admin/reports': ['Reports', 'Review operational and booking insights.'],
  '/admin/profile': ['Admin Profile', 'Manage your administrator account and security.'],
};

export default function AdminLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState('');
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminNotificationReadIds') || '[]'); }
    catch { return []; }
  });
  const [title, subtitle] = routeTitles[location.pathname] || ['Admin', 'Smart Parking Management'];
  const adminName = formatDisplayName(user?.name, 'Administrator');
  const initial = adminName.charAt(0).toUpperCase();

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    const [bookingResult, paymentResult, supportResult] = await Promise.allSettled([
      getAdminBookings(),
      getAdminPayments(),
      getAdminSupportTickets(),
    ]);
    const items = [];

    if (supportResult.status === 'fulfilled') {
      (supportResult.value.data || [])
        .filter((ticket) => ticket.status !== 'RESOLVED')
        .forEach((ticket) => items.push({
          id: `support-${ticket.id}`,
          tone: 'support',
          title: `Support request #${ticket.id}`,
          message: `${ticket.userName || 'User'}: ${ticket.subject || ticket.category || 'Help requested'}`,
          date: ticket.createdAt,
          route: '/admin/support',
        }));
    }
    if (paymentResult.status === 'fulfilled') {
      (paymentResult.value.data || [])
        .filter((payment) => ['PENDING', 'UNPAID', 'FAILED'].includes(payment.status))
        .forEach((payment) => items.push({
          id: `payment-${payment.id}`,
          tone: 'payment',
          title: `${payment.status === 'FAILED' ? 'Failed' : 'Pending'} payment`,
          message: `Booking #${payment.bookingId} · ${payment.userName || 'User'} · ₹${payment.amount}`,
          date: payment.createdAt,
          route: '/admin/payments',
        }));
    }
    if (bookingResult.status === 'fulfilled') {
      (bookingResult.value.data || [])
        .filter((booking) => booking.bookingStatus === 'OCCUPIED')
        .forEach((booking) => items.push({
          id: `checkin-${booking.id}`,
          tone: 'booking',
          title: `Vehicle checked in`,
          message: `Booking #${booking.id} · ${booking.vehicleNumber} · ${booking.parkingLot}`,
          date: booking.startTime,
          route: '/admin/bookings',
        }));
    }

    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setNotifications(items.slice(0, 20));
    setNotificationsError(
      [bookingResult, paymentResult, supportResult].every((result) => result.status === 'rejected')
        ? 'Notifications could not be loaded.'
        : '',
    );
    setNotificationsLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    return onParkingDataChanged(loadNotifications);
  }, []);

  useEffect(() => {
    const closeMenus = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setProfileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
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

  const unreadCount = notifications.filter((item) => !readNotificationIds.includes(item.id)).length;
  const saveReadIds = (ids) => {
    const next = [...new Set(ids)].slice(-100);
    setReadNotificationIds(next);
    localStorage.setItem('adminNotificationReadIds', JSON.stringify(next));
  };
  const openNotification = (item) => {
    saveReadIds([...readNotificationIds, item.id]);
    setNotificationsOpen(false);
    navigate(item.route);
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
            <div className="admin-notification-menu" ref={notificationRef}>
              <button
                type="button"
                className="admin-notification-button"
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setProfileOpen(false);
                  setNotificationsOpen((current) => !current);
                  if (!notificationsOpen) loadNotifications();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
                {unreadCount > 0 && <span className="admin-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <section className="admin-notification-dropdown" aria-label="Admin notifications">
                  <header>
                    <div><strong>Notifications</strong><small>{unreadCount} unread</small></div>
                    {unreadCount > 0 && <button type="button" onClick={() => saveReadIds([...readNotificationIds, ...notifications.map((item) => item.id)])}>Mark all read</button>}
                  </header>
                  <div className="admin-notification-list">
                    {notificationsLoading ? <p className="admin-notification-state">Loading notifications…</p>
                      : notificationsError ? <p className="admin-notification-state is-error">{notificationsError}</p>
                        : notifications.length === 0 ? <p className="admin-notification-state">No pending notifications.</p>
                          : notifications.map((item) => {
                            const unread = !readNotificationIds.includes(item.id);
                            return <button type="button" key={item.id} className={`admin-notification-item ${unread ? 'is-unread' : ''}`} onClick={() => openNotification(item)}>
                              <span className={`admin-notification-icon tone-${item.tone}`}>{item.tone === 'support' ? '?' : item.tone === 'payment' ? '₹' : 'P'}</span>
                              <span><strong>{item.title}</strong><small>{item.message}</small>{item.date && <time>{new Date(item.date).toLocaleString()}</time>}</span>
                              {unread && <i aria-label="Unread" />}
                            </button>;
                          })}
                  </div>
                  <footer><button type="button" onClick={loadNotifications}>Refresh notifications</button></footer>
                </section>
              )}
            </div>
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
