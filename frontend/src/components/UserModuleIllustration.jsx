import React from 'react';
import { useLocation } from 'react-router-dom';
import dashboardHero from '../assets/illustrations/dashboard-hero.png';
import findParkingHero from '../assets/illustrations/find-parking-hero.png';
import availableSlotsHero from '../assets/illustrations/available-slots-hero.png';
import myBookingsHero from '../assets/illustrations/my-bookings-hero.png';
import bookingHistoryHero from '../assets/illustrations/booking-history-hero.png';
import paymentsHero from '../assets/illustrations/payments-hero.png';
import profileHero from '../assets/illustrations/profile-hero.png';

const illustrationsByRoute = {
  '/user/dashboard': { src: dashboardHero, alt: 'Car entering a smart parking gate in a modern city' },
  '/user/home': { src: dashboardHero, alt: 'Car entering a smart parking gate in a modern city' },
  '/user/find-parking': { src: findParkingHero, alt: 'Finding nearby parking with a smartphone map' },
  '/user/available-slots': { src: availableSlotsHero, alt: 'Available spaces in a multi-level smart parking building' },
  '/user/bookings': { src: myBookingsHero, alt: 'Confirmed parking reservation with a parked car' },
  '/user/booking-history': { src: bookingHistoryHero, alt: 'Timeline of previous parking bookings' },
  '/user/payments': { src: paymentsHero, alt: 'Secure digital parking payment confirmation' },
  '/user/profile': { src: profileHero, alt: 'Secure parking user profile and account' },
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
