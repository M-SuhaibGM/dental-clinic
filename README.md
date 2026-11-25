# 🦷 BrightSmile — Dental Clinic Management System

A full-stack web app for clinic staff to manage **doctors** and **appointments**: React + Vite on the front end, an Express REST API, and PostgreSQL for storage, deployed on Render.

- **Live app:** `https://<your-service>.onrender.com` (replace after deploying)
- **Health check:** `https://<your-service>.onrender.com/api/health`

---

## Features

| Area | What it does |
|---|---|
| **Dashboard** (`/dashboard`) | Summary cards (total doctors, upcoming, today's, pending) that link to pre-filtered lists, plus the next 8 upcoming appointments |
| **Doctors** (`/doctors`) | Searchable, filterable table; add/edit in a modal; detail page (`/doctors/:id`) with weekly availability and upcoming appointments; delete confirmation |
| **Appointments** (`/appointments`) | Filters for search, status, doctor and date (stored in the URL); add/edit form with a doctor selector; inline status changes; delete confirmation |
| **Business rules** (API) | No double-booking a doctor, bookings must fall within the doctor's working days and hours, inactive doctors can't be booked, invalid doctor IDs are rejected, doctors with appointments can't be deleted |
| **UX states** | Loading spinners, empty states (with and without filters), success/error toasts, inline field errors from both client and server validation |
| **Responsive / a11y** | Sidebar turns into a drawer on mobile and tables into cards; labelled form controls, `aria-invalid`, focus handling in modals, Esc to close, skip link |

## Tech stack

- **Frontend:** React 19, Vite, react-router-dom 7, plain CSS (custom design tokens, no UI library)
- **Backend:** Node.js 18+, Express 5, `pg` (node-postgres), Zod for validation
- **Database:** PostgreSQL 14+
- **Hosting:** Render (one web service serves both the API and the built SPA, plus a Render PostgreSQL instance)

## Project structure

```
dental-clinic/
├── client/                    # React + Vite SPA
│   └── src/
│       ├── components/        # Reusable UI: Layout, Button, Modal, ConfirmDialog, FormField,
│       │                      #   DataTable, Badge, EmptyState, StateViews, StatCard, Toast, Icons
│       ├── features/          # DoctorForm, AppointmentForm (modal forms)
│       ├── pages/             # Dashboard, Doctors, DoctorDetail, Appointments, NotFound
│       ├── services/          # API service layer (apiClient + doctor/appointment/stats services)
│       ├── hooks/             # useFetch, useDebounced, useForm
│       └── utils/             # date/time formatting, constants
├── server/                    # Express REST API
│   └── src/
│       ├── routes/            # /api router
│       ├── controllers/       # doctors, appointments, stats
│       ├── validators/        # Zod schemas (request validation)
│       ├── middleware/        # ApiError + centralized error handler
│       ├── db/                # pool, schema.sql, migrate, seed, mockData (seed only)
│       └── utils/
├── server/test/               # Unit tests (node:test): validation rules + date helpers
└── render.yaml                # Render Blueprint (web service + Postgres)
```

## Running locally

**Prerequisites:** Node.js 18 or newer, and PostgreSQL running locally (or any Postgres connection string).

```bash
# 1. Clone and switch to the develop branch
git clone https://github.com/<you>/dental-clinic.git
cd dental-clinic && git checkout develop

# 2. Install all dependencies (root, server, client)
npm run install:all

# 3. Create the database
createdb dental_clinic            # or: psql -U postgres -c "CREATE DATABASE dental_clinic;"

# 4. Configure environment
cp server/.env.example server/.env   # then edit DATABASE_URL

# 5. Start API + React together
npm run dev
```

- React app: http://localhost:5173 (Vite proxies `/api` to the API)
- API: http://localhost:5000/api/health

On first start the server **creates the tables and seeds mock data** (6 doctors, 16 appointments dated relative to today). To start fresh at any time, run `npm run db:reset`.

You can also run each side on its own: `cd server && npm run dev`, then `cd client && npm run dev`.

Run the unit tests with `npm test --prefix server` (no database needed).

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string, e.g. `postgresql://postgres:postgres@localhost:5432/dental_clinic` |
| `DATABASE_SSL` | | `true` for hosted DBs reached over SSL (Render *External* URL), otherwise `false` |
| `PORT` | | API port (default `5000`; Render sets this automatically) |
| `SEED_ON_START` | | `true` (default) seeds mock data on boot **only if the doctors table is empty** |
| `CORS_ORIGIN` | | Comma-separated allowed origins, needed only if the frontend is hosted on another domain |
| `TZ` | | Timezone for "today" calculations (e.g. `Asia/Karachi`) |

`client/.env` (optional, see `client/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL. Leave empty when the API is served from the same origin (the default setup). |

> Secrets are never committed. `.env` is git-ignored; only the `.env.example` files are tracked.

## Database

Schema: [`server/src/db/schema.sql`](server/src/db/schema.sql), applied automatically on boot (idempotent `CREATE TABLE IF NOT EXISTS`). To apply it by hand, run `npm run db:migrate --prefix server`.

```
doctors                                   appointments
─────────────────────────────             ──────────────────────────────────────
id              SERIAL PK                 id                SERIAL PK
name            VARCHAR(120)              patient_name      VARCHAR(120)
specialization  VARCHAR(120)              patient_phone     VARCHAR(30)
email           VARCHAR(160) UNIQUE       patient_email     VARCHAR(160) NULL
phone           VARCHAR(30)               doctor_id         INT FK → doctors.id (ON DELETE RESTRICT)
available_days  TEXT[]  (Mon..Sun)        appointment_date  DATE
start_time      TIME                      start_time        TIME
end_time        TIME  (CHECK > start)     duration_minutes  INT (10–240)
is_active       BOOLEAN                   reason            VARCHAR(500)
created_at / updated_at                   status            pending|confirmed|completed|cancelled
                                          created_at / updated_at
```

Indexes: `(doctor_id, appointment_date)`, `appointment_date` and `status`, matching the overlap check and the list filters.

## API reference

Base URL: `/api`. Every response is JSON.

- **Success:** `{ "data": ..., "message"?: "..." }`
- **Error:** `{ "error": { "message": "...", "details"?: { "field": "reason" } } }`

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | API + DB status | 200 | 503 |
| GET | `/stats?date=YYYY-MM-DD` | Dashboard counts + next 8 appointments | 200 | |
| GET | `/doctors?search=&active=true\|false` | List doctors (includes `upcoming_count`) | 200 | |
| GET | `/doctors/:id` | Doctor + upcoming appointments | 200 | 400, 404 |
| POST | `/doctors` | Create doctor | 201 | 400, 409 (email taken) |
| PUT | `/doctors/:id` | Update doctor | 200 | 400, 404, 409 |
| DELETE | `/doctors/:id` | Delete doctor (only if no appointments) | 200 | 404, 409 |
| GET | `/appointments?search=&status=&doctor_id=&date=&from=&to=` | List appointments (joined with doctor) | 200 | |
| GET | `/appointments/:id` | Single appointment | 200 | 400, 404 |
| POST | `/appointments` | Create appointment | 201 | 400, 409 (overlap) |
| PUT | `/appointments/:id` | Update appointment | 200 | 400, 404, 409 |
| PATCH | `/appointments/:id/status` | Change status only | 200 | 400, 404, 409 |
| DELETE | `/appointments/:id` | Delete appointment | 200 | 404 |

### Examples

```bash
# Create a doctor
curl -X POST http://localhost:5000/api/doctors -H "Content-Type: application/json" -d '{
  "name": "Dr. Kamal Hussain", "specialization": "Prosthodontics",
  "email": "kamal@brightsmile.pk", "phone": "+92 333 7654321",
  "available_days": ["Mon","Wed","Fri"], "start_time": "09:00", "end_time": "17:00", "is_active": true
}'

# Book an appointment
curl -X POST http://localhost:5000/api/appointments -H "Content-Type: application/json" -d '{
  "patient_name": "Bilal Saeed", "patient_phone": "+92 345 1112223", "doctor_id": 1,
  "appointment_date": "2026-12-01", "start_time": "11:00", "duration_minutes": 30,
  "reason": "Broken tooth", "status": "pending"
}'

# Change status
curl -X PATCH http://localhost:5000/api/appointments/5/status -H "Content-Type: application/json" -d '{"status":"confirmed"}'
```

An overlapping booking returns `409`:

```json
{ "error": { "message": "Time slot overlaps with Ali Hassan's appointment at 09:00 (30 min)",
             "details": { "start_time": "Overlaps an existing appointment" } } }
```

A validation failure returns `400`:

```json
{ "error": { "message": "Validation failed",
             "details": { "patient_name": "Patient name is required", "doctor_id": "Doctor is required" } } }
```

## Key design decisions

- **Service layer on the client** (`client/src/services`). Components never call `fetch` directly. `apiClient` turns every error into an `ApiError` carrying `message` and per-field `details`, which the forms show inline.
- **Validation on both sides.** Client checks give instant feedback; Zod schemas on the server are the real source of truth.
- **Overlap prevention.** Two time ranges overlap when each starts before the other ends. Only `pending` and `confirmed` appointments hold a slot. Checks run inside a transaction that holds a per-doctor `pg_advisory_xact_lock`, so two simultaneous bookings can't both get through.
- **Referential integrity.** The `ON DELETE RESTRICT` foreign key plus an API-level `409` mean a doctor with appointments can't be deleted; staff are told to mark the doctor inactive instead.
- **Dates as plain strings.** `DATE` and `TIME` columns go to the client as `YYYY-MM-DD` / `HH:MM:SS` strings, which avoids timezone shifts. The dashboard sends the browser's local date as "today".
- **URL-driven filters.** Appointment filters live in the query string, so the dashboard cards can deep-link (for example `/appointments?status=pending`) and filters survive a refresh.
- **One Render service.** Express serves `client/dist` with an SPA fallback, so there is one URL, no CORS setup, and one deploy. Separate hosting is still possible with `VITE_API_URL` + `CORS_ORIGIN`.

## Deploying to Render

**Option A: Blueprint (recommended)**
1. Push the repo to GitHub, with the code on the `develop` branch.
2. In Render, go to **New → Blueprint**, pick the repo, and Render reads `render.yaml`.
3. It creates the `dental-clinic-db` Postgres database and the `dental-clinic` web service, wiring `DATABASE_URL` automatically.
4. When the deploy finishes, open `https://<service>.onrender.com/api/health`. It should return `{"status":"ok","database":"connected"}`.

**Option B: Manual**
1. **New → PostgreSQL** (free plan). Copy its *Internal Database URL*.
2. **New → Web Service**, connect the repo, set branch `develop`, then:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
   - Env vars: `DATABASE_URL=<internal url>`, `DATABASE_SSL=false`, `NODE_VERSION=22`, `TZ=Asia/Karachi`

Tables and seed data are created on first boot. Free Render services sleep after inactivity, so the first request can take about 30–50 seconds.

## Testing

- **API:** tested with `curl` for every endpoint, covering validation errors (400), not-found (404), duplicate email (409), overlapping slot (409), outside working hours, wrong weekday, inactive doctor, invalid doctor reference, deleting a doctor with appointments (409), reactivating a cancelled appointment into a taken slot (409) and malformed JSON (400).
- **Unit tests:** `npm test --prefix server` runs the `node:test` suite for the Zod validation rules (names, phone, email, working hours, durations, statuses), id parsing and the date helpers.
- **Manual UI checks:** every doctor and appointment create / edit / delete from the browser, client-side and server-side error display, delete confirmations, filters and URL deep links, the 404 page, loading/empty/error states, and the mobile layout (drawer + card tables).

## Known limitations

- No authentication or roles. The app assumes trusted clinic staff on an internal network; JWT login would be the next step.
- No pagination. Lists are fine for a single clinic's volume, and `LIMIT/OFFSET` could be added to the list endpoints.
- Patients are stored inline on appointments rather than in a separate `patients` table, which keeps the scope to the two required entities.
- Doctor availability is one daily time window per doctor, with no breaks or holidays.
- Free Render instances sleep when idle, so the first request is slow.
