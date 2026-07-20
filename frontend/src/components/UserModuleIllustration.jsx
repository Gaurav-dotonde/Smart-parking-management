import React from 'react';
import { useLocation } from 'react-router-dom';
import dashboardHero from '../assets/illustrations/dashboard-hero.png';

const illustrationsByRoute = {
  '/user/dashboard': { src: dashboardHero, alt: 'Car entering a smart parking gate in a modern city' },
  '/user/home': { src: dashboardHero, alt: 'Car entering a smart parking gate in a modern city' },
};

export default function UserModuleIllustration() {
  const { pathname } = useLocation();
  const illustration = illustrationsByRoute[pathname];

  if (!illustration) return null;

  return (
    <section className="user-module-illustration" aria-label="Page illustration">
      <img
        src={illustration.src}
        alt={illustration.alt}
        width="1792"
        height="1024"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}
