import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDisplayName } from '../utils/formatDisplayName';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/user') || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const showAuthenticatedLinks = user && location.pathname !== '/login';

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <div className="navbar">
      <Link to="/" className="brand">🅿️ Smart Parking</Link>
      <div>
        {showAuthenticatedLinks ? (
          <>
            <Link to="/lots">Parking Lots</Link>
            <Link to="/my-bookings">My Bookings</Link>
            {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
            <button onClick={handleLogout}>Logout ({formatDisplayName(user.name, 'User')})</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}
