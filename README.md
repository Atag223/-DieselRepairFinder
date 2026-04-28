# DieselRepairFinder.com

> **Mobile Diesel Mechanics. Anytime. Anywhere.**

A production-ready MVP marketplace connecting users with mobile diesel mechanics for roadside repair and service. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Prisma.

---

## Features

- **Homepage** — Hero section, repair request form, how-it-works, service categories, launch cities grid, mechanic CTA
- **Repair Request System** — Submit requests with full details, stored in DB, confirmation email sent
- **Mechanic Signup** — `/join` page with full application form
- **API Routes** — `POST /api/repair-requests` and `POST /api/mechanics/apply`
- **Email Notifications** — Via [Resend](https://resend.com) on new requests and signups
- **Dark Theme** — Black background with blue accents, mobile responsive

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Framework  | Next.js 14 (App Router) |
| Language   | TypeScript              |
| Styling    | Tailwind CSS v3         |
| Database   | PostgreSQL + Prisma ORM |
| Email      | Resend                  |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)
- [Resend](https://resend.com) account for email

### 1. Clone & Install

```bash
git clone https://github.com/your-org/diesel-repair-finder.git
cd diesel-repair-finder
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/diesel_repair_finder"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTIFY_EMAIL="admin@dieselrepairfinder.com"
FROM_EMAIL="noreply@dieselrepairfinder.com"
```

### 3. Set Up the Database

```bash
npx prisma migrate dev --name init
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── repair-requests/route.ts   # POST /api/repair-requests
│   │   │   └── mechanics/apply/route.ts   # POST /api/mechanics/apply
│   │   ├── join/
│   │   │   └── page.tsx       # Mechanic signup page
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # Homepage
│   └── lib/
│       ├── prisma.ts           # Prisma client singleton
│       └── email.ts            # Resend email utilities
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## API Reference

### `POST /api/repair-requests`

Submit a new diesel repair request.

**Required fields:** `requesterName`, `requesterEmail`, `requesterPhone`, `serviceAddress`, `issueType`, `issueDetails`

**Optional fields:** `requesterCompany`, `city`, `state`, `breakdownNow`, `truckType`, `unitNumber`, `roadsideLocation`, `specialNotes`

**Response:**
```json
{
  "success": true,
  "referenceId": "clxxxxxxxxxxxxx",
  "message": "Your repair request has been submitted."
}
```

---

### `POST /api/mechanics/apply`

Submit a mechanic application.

**Required fields:** `businessName`, `contactName`, `phone`, `email`, `city`, `state`, `serviceRadius`

**Optional fields:** `website`, `is24_7`, `services`, `notes`

**Response:**
```json
{
  "success": true,
  "id": "clxxxxxxxxxxxxx",
  "message": "Your application has been submitted."
}
```

---

## Build

```bash
npm run build
npm start
```
