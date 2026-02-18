# Roomsily

Roomsily (www.roomsily) is a comprehensive co-living portal that helps roommates and property managers orchestrate rent payments, amenity bookings, document sharing, and communication through a beautifully streamlined experience.

## Features

### 🏠 **Core Functionality**
- **Multi-tenant Property Management**: Support for multiple roommates sharing rental properties
- **Role-based Access Control**: Separate workflows for tenants, roommates, property managers, and admins
- **Responsive Mobile-First Design**: Optimized for mobile usage with modern UI components

### 💳 **Payment Management**
- **Stripe Integration**: Secure rent payments with autopay functionality
- **Subscription Support**: Recurring rent payments with configurable billing cycles
- **Payment Receipts**: Automatic receipt generation and email notifications
- **Financial Tracking**: Complete payment history and reconciliation tools

### 📅 **Amenity Bookings**
- **Shared Space Scheduling**: Book kitchen, TV room, PlayStation, parking spots, and shared computers
- **Cal.com Integration**: Self-hosted calendar system with double-booking prevention
- **Conflict Detection**: Smart scheduling to prevent overlapping reservations

### 📄 **Document Management**
- **Documenso Integration**: Secure document signing and storage
- **Lease Agreements**: Digital lease management with version history
- **Audit Trails**: Complete document access logging for compliance

### 💬 **Communication**
- **Realtime Messaging**: Roommate-to-roommate communication with threads
- **Notifications**: In-app and email notifications for important events
- **Maintenance Requests**: Issue tracking and resolution workflow

### 🏢 **Admin Features**
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

### Database Setup

Run the Supabase migrations to set up the required database tables:

```bash
# Apply database migrations (requires Supabase CLI)
supabase db push
```

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Stripe Configuration

1. Create products and prices in your Stripe dashboard
2. Set up webhooks for payment events
3. Configure webhook endpoints to point to `/api/stripe/webhook`

### Deployment

Use the deployment runbook at [`docs/engineering/vercel-deployment-runbook.md`](docs/engineering/vercel-deployment-runbook.md) and configure variables according to [`docs/engineering/environment-contract.md`](docs/engineering/environment-contract.md).


## CI & Branch Protection

- GitHub Actions uses pnpm for install/lint/typecheck/test/build gates.
- `main` should be protected with required checks and no direct pushes.
- See [`docs/engineering/branch-protection.md`](docs/engineering/branch-protection.md) for policy details.

## Operations & Reliability

Review the [Performance & Availability Playbook](docs/perf/playbook.md) for service level objectives, monitoring dashboards, alert channels, and rollback procedures across Next.js, Supabase, and Stripe integrations.

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
