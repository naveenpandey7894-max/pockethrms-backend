# PocketHRMS Server (Backend)

Node.js + Express + PostgreSQL (Prisma ORM) backend for PocketHRMS clone.

## Setup (CLI steps)

1. PostgreSQL mein database banao:
   ```bash
   psql -U postgres
   CREATE DATABASE pockethrms;
   \q
   ```

2. `.env` file mein `DATABASE_URL` update karo apne PostgreSQL username/password/db ke sath:
   ```
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/pockethrms?schema=public"
   ```

3. Dependencies install karo (agar node_modules missing hai):
   ```bash
   npm install
   ```

4. Prisma client generate karo:
   ```bash
   npm run prisma:generate
   ```

5. Database mein tables create karo (migration run karo):
   ```bash
   npm run prisma:migrate
   ```

6. Server start karo (dev mode, auto-restart ke sath):
   ```bash
   npm run dev
   ```

   Server chalega: `http://localhost:5000`
   Health check: `GET http://localhost:5000/api/health`

## Available APIs

### Auth
- `POST /api/auth/register` — body: `{ name, email, password, role, empCode, departmentId, designationId, phone }`
- `POST /api/auth/login` — body: `{ email, password }`
- `POST /api/auth/refresh` — body: `{ refreshToken }`

### Employees (JWT required)
- `GET /api/employees`
- `GET /api/employees/:id`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

### Attendance (JWT required)
- `POST /api/attendance/check-in` — body: `{ employeeId }`
- `POST /api/attendance/check-out` — body: `{ employeeId }`
- `GET /api/attendance/:employeeId`

### Leaves (JWT required)
- `POST /api/leaves` — body: `{ employeeId, leaveTypeId, fromDate, toDate, reason }`
- `GET /api/leaves/:employeeId`
- `PATCH /api/leaves/:id/status` — body: `{ status: "APPROVED" | "REJECTED" }`

## Note
Register karne se pehle Department aur Designation table mein kam se kam ek-ek row honi chahiye
(abhi seed script nahi banaya — chaaho to bata dena, agla step mein bana dunga).

## Next Steps
- Department/Designation CRUD APIs + seed script
- Payroll module APIs
- React Native CLI app (login, dashboard, attendance, leave screens)
