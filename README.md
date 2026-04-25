# Roomsily

Roomsily (www.roomsily) is a comprehensive co-living portal that helps roommates and property managers orchestrate rent payments, amenity bookings, document sharing, and communication through a beautifully streamlined experience.

## Features

### **Core Functionality**

- **Multi-tenant Property Management**: Support for multiple roommates sharing rental properties
- **Role-based Access Control**: Separate workflows for tenants, roommates, property managers, and admins
- **Auth-First Entry Experience**: Root route directs unauthenticated users to focused sign-in and onboarding actions
- **Responsive Mobile-First Design**: Optimized for mobile usage with modern UI components

### **Payment Management**

- **Stripe Integration**: Secure rent payments with autopay functionality
- **Subscription Support**: Recurring rent payments with configurable billing cycles
- **Payment Receipts**: Automatic receipt generation and email notifications
- **Financial Tracking**: Complete payment history and reconciliation tools

### **Amenity Bookings**

- **Shared Space Scheduling**: Book kitchen, TV room, PlayStation, parking spots, and shared computers
- **Cal.com Integration**: Self-hosted calendar system with double-booking prevention
- **Conflict Detection**: Smart scheduling to prevent overlapping reservations

### **Document Management**

- **Documenso Integration**: Secure document signing and storage
- **Lease Agreements**: Digital lease management with version history
- **Audit Trails**: Complete document access logging for compliance

### **Communication**

- **Realtime Messaging**: Roommate-to-roommate communication with threads
- **Notifications**: In-app and email notifications for important events
- **Maintenance Requests**: Issue tracking and resolution workflow

### **Admin Features**

- **Property Management**: Multi-unit property administration
- **Visitor Logs**: Overnight guest tracking and approval workflows
- **Analytics Dashboard**: Payment success rates, booking utilization, and financial reports

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Authentication**: Supabase Auth with email magic links
- **Database**: PostgreSQL with Supabase
- **Payments**: Stripe Checkout + Billing Portal
- **Calendar**: Self-hosted Cal.com instance
- **Documents**: Documenso for digital signatures
- **UI**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- Supabase account
- Stripe account
- Vercel account (for deployment)

### Environment Setup

See the full multi-environment contract in [`docs/engineering/environment-contract.md`](docs/engineering/environment-contract.md). For local development, copy the required values into `.env.local`.

#### Dashboard data source modes (local)

- **DB mode (default when Supabase env is present):** if `NEXT_PUBLIC_SUPABASE_URL` and one of `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set, the dashboard uses production-backed loaders by default.
- **Mock mode (explicit opt-in):** set `DASHBOARD_DATA_SOURCE=mock` to force mock dashboard data.
- When mock mode is enabled, startup logs a warning to reduce accidental use.

### Database Setup

Database workflows assume a local Supabase stack and Postgres client tooling are available.

Prerequisites:

- Supabase CLI installed and authenticated
- Local Supabase services started (`supabase start`)
- `psql` available in your shell
- Optional: `SUPABASE_DB_URL` set if your local database is not on the default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Run the bootstrap script to push migrations, apply demo seed data, and print row-count sanity checks:

```bash
# Applies migrations, runs supabase/demo/seed.sql, and prints counts
pnpm db:bootstrap
```

Expected output (example):

```text
[1/3] Applying latest Supabase migrations with 'supabase db push'
[2/3] Applying demo seed data from supabase/demo/seed.sql
[3/3] Sanity-check row counts
  - profiles:      6
  - units:         2
  - rent_payments: 10
  - bookings:      8

Database bootstrap complete.
```

After bootstrapping, validate that dashboard production query dependencies are still present:

```bash
pnpm db:check-dashboard-schema
```

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application. Tailwind is configured through the canonical `tailwind.config.js` file (the Next.js/PostCSS pipeline resolves `tailwind.config.js` before `tailwind.config.ts`).

### Stripe Configuration

1. Create products and prices in your Stripe dashboard
2. Set up webhooks for payment events
3. Configure webhook endpoints to point to `/api/stripe/webhook`

### Deployment

Use the deployment runbook at [`docs/engineering/vercel-deployment-runbook.md`](docs/engineering/vercel-deployment-runbook.md) and configure variables according to [`docs/engineering/environment-contract.md`](docs/engineering/environment-contract.md).

### API Runtime Targets

- This repository supports **Next.js App Router Route Handlers only** under `app/api` (`route.ts` / `route.js` files).
- Cross-runtime handlers (for example Rust runtime files like `*.rs`) are intentionally unsupported in `app/api` to avoid deployment ambiguity.
- CI enforces this with `pnpm check:api-runtime-targets`.

## CI & Branch Protection

- GitHub Actions uses pnpm for install/lint/typecheck/test/build gates.
- `main` should be protected with required checks and no direct pushes.
- See [`docs/engineering/branch-protection.md`](docs/engineering/branch-protection.md) for policy details.



## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   ├── documents/         # Document management
│   ├── payments/          # Payment functionality
│   └── ...
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── supabase/              # Database migrations and config
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```
