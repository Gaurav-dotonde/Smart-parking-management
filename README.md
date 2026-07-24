# 🅿️ Smart Parking Slot Booking System

A full-stack parking slot booking system built with **Spring Boot + React + MySQL**, featuring JWT authentication, an interactive visual parking map, and concurrency-safe slot booking.

---

## Tech Stack

**Backend:** Java 17, Spring Boot 3, Spring Security, JWT, Spring Data JPA, MySQL, Maven, Lombok
**Frontend:** React (Vite), React Router, Axios, plain CSS

---

## Features

- User registration & login with JWT authentication (BCrypt password hashing)
- Role-based access: `USER` and `ADMIN`
- Browse parking lots, search by name/location
- Interactive, color-coded visual slot map (available / booked / selected)
- Book a slot for a chosen time range with live amount calculation
- Polling every 5 seconds so the slot map reflects other users' bookings in near real-time
- Booking history + cancellation
- Admin panel to create parking lots (auto-generates slots)
- **Concurrency-safe booking** — prevents two users from double-booking the same slot

---

## The Core Technical Challenge: Preventing Double Booking

If two users click "Book" on the same slot at nearly the same moment, a naive
check-then-update ("if status == AVAILABLE, set to BOOKED") can let both
requests succeed, because both might read `AVAILABLE` before either one writes.

**Solution used here:**
- `BookingService.bookSlot()` is wrapped in `@Transactional`
- It fetches the slot using `ParkingSlotRepository.findByIdForUpdate()`, which runs
  `SELECT ... FOR UPDATE` (a **pessimistic write lock**) on that row
- The first transaction to reach this line locks the row. Any second transaction
  trying to book the *same* slot blocks until the first transaction commits or rolls back
- Once unblocked, the second transaction re-reads the slot and sees it's already `BOOKED`,
  so it correctly throws a conflict error instead of double-booking

This is a standard, interview-friendly pattern: "I prevented the race condition using
a pessimistic row lock inside a single database transaction."

---

## Project Structure

```
parking-system/
├── backend/                 # Spring Boot app
│   └── src/main/java/com/parking/
│       ├── controller/      # REST endpoints
│       ├── service/         # Business logic (BookingService has the locking logic)
│       ├── repository/      # Spring Data JPA repositories
│       ├── model/            # JPA entities
│       ├── dto/              # Request/response objects
│       ├── security/         # JWT filter + util
│       └── config/           # Security config, exception handler
├── frontend/                 # React (Vite) app
│   └── src/
│       ├── pages/             # Login, Register, ParkingLots, SlotBooking, MyBookings, AdminPanel
│       ├── components/        # Navbar, ProtectedRoute
│       ├── services/          # Axios API calls
│       └── context/           # AuthContext (JWT + user state)
└── database/
    └── seed.sql               # Notes on creating an admin user
```

---

## Local Setup

### 1. Prerequisites
- Java 17+, Maven, Node.js 18+, MySQL running locally

### 2. Backend

```bash
cd backend
```

`src/main/resources/application.properties` now reads MySQL settings from environment variables when they are present:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME`

If those are not set, the app falls back to `jdbc:mysql://localhost:3306/parking_db`, username `root`, and password `root`. The database `parking_db` is created automatically on first run.

```bash
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000` (Vite proxies `/api` calls to the backend).

### 4. First administrator
On startup, the backend creates one active administrator only when no `ADMIN` account
exists. The password is BCrypt-encoded before the account is saved through JPA.

- Email: `admin@smartparking.com`
- Password: `Admin@123`

Override these development defaults with `DEFAULT_ADMIN_NAME`,
`DEFAULT_ADMIN_EMAIL`, and `DEFAULT_ADMIN_PASSWORD`. Change the password after the
first login. Further `USER` or `ADMIN` accounts can be created from **Admin > Users**;
no SQL seed or manual role update is required.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/lots` | Public | List all parking lots |
| GET | `/api/lots/{id}` | Public | Get one lot |
| GET | `/api/lots/{id}/slots` | Public | List slots for a lot |
| POST | `/api/lots` | Admin | Create a lot (auto-generates slots) |
| POST | `/api/bookings/book` | User | Book a slot (concurrency-safe) |
| PUT | `/api/bookings/{id}/cancel` | User | Cancel own booking |
| GET | `/api/bookings/user/{userId}` | User | Booking history |

---

## Deployment

- **Backend:** Railway / Render (set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and optionally `SPRING_DATASOURCE_DRIVER_CLASS_NAME` as env vars, or edit `application.properties` before building)
- **Frontend:** Vercel / Netlify (set the API base URL to your deployed backend, or use Vite env vars)
- **Database:** Railway MySQL / Clever Cloud / PlanetScale (free tiers available)

---

## Future Improvements
- Payment gateway integration (Razorpay test mode)
- WebSocket-based real-time updates instead of polling
- Slot types (EV, disabled, regular) and per-lot operating hours
- Admin booking management dashboard with filters
- Unit tests for `BookingService` covering the concurrency scenario

---

## Note on this build
This is an intermediate-level version focused on the core booking flow and the
double-booking prevention logic. A more advanced spec (time-range overlap validation,
booking references, slot maintenance status, admin booking dashboard with pagination,
etc.) can be layered on top of this same architecture if you want to extend it further —
just ask.
