import React from 'react';

export default function UserPageShell({ title, description }) {
  return (
    <div className="user-page-card user-page-shell-card">
      <p className="user-page-eyebrow">SMART PARKING USER PORTAL</p>
      <h2>{title}</h2>
      {description ? <p className="user-page-description">{description}</p> : null}
    </div>
  );
}
