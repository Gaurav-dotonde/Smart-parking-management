import React from 'react';
import { Navigate } from 'react-router-dom';

export default function UserHome() {
  return <Navigate to="/user/dashboard" replace />;
}
