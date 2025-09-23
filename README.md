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
- npm/yarn/pnpm
- Supabase account
- Stripe account
- Vercel account (for deployment)

### Environment Setup

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"

# Stripe
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_webhook_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Document Management (Optional)
DOCUMENSO_API_KEY="your_documenso_api_key"
DOCUMENSO_BASE_URL="your_documenso_instance_url"

# Calendar (Optional)
CALCOM_API_KEY="your_calcom_api_key"
CALCOM_BASE_URL="your_calcom_instance_url"
```

### Database Setup

Run the Supabase migrations to set up the required database tables:

```bash
# Apply database migrations (requires Supabase CLI)
supabase db push
```

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Stripe Configuration

1. Create products and prices in your Stripe dashboard
2. Set up webhooks for payment events
3. Configure webhook endpoints to point to `/api/stripe/webhook`

### Deployment

Deploy to Vercel with the following environment variables configured in your Vercel dashboard:

- All Supabase environment variables
- Stripe keys (use live keys for production)
- Document and calendar service URLs/keys

## Operations & Reliability

Review the [Performance & Availability Playbook](docs/perf/playbook.md) for service level objectives, monitoring dashboards, alert channels, and rollback procedures across Next.js, Supabase, and Stripe integrations.

### Health Checks

The portal exposes dedicated health endpoints for infrastructure probes and uptime monitoring:

- `GET /api/health/liveness` returns process metrics (PID, uptime, RSS memory) and always responds with HTTP 200 when the runtime is reachable.
- `GET /api/health/readiness` verifies Supabase connectivity, Stripe webhook configuration, Resend, Documenso, and Cal.com credentials. The endpoint responds with HTTP 200 for `pass`/`warn` states and HTTP 503 when any critical dependency fails.

Both endpoints return a JSON payload with [`pass` | `warn` | `fail`] statuses per component. See [docs/engineering/health-checks.md](docs/engineering/health-checks.md) for the full schema and troubleshooting guidance.

#### Deployment probe configuration

| Platform | Liveness probe | Readiness probe | Notes |
| --- | --- | --- | --- |
| **Vercel** | `https://<deployment>/api/health/liveness` | `https://<deployment>/api/health/readiness` | Configure as [Uptime Monitors](https://vercel.com/docs/observability/monitors) or project health checks; readiness returning 503 will block traffic promotion. |
| **Kubernetes** | `httpGet: { path: /api/health/liveness, port: 3000 }` | `httpGet: { path: /api/health/readiness, port: 3000 }` | Recommended probe thresholds: `initialDelaySeconds: 10`, `periodSeconds: 15`, `failureThreshold: 3`. |
| **Docker Compose** | `healthcheck: ["CMD", "curl", "-f", "http://localhost:3000/api/health/liveness"]` | Use `curl http://localhost:3000/api/health/readiness` in orchestrator scripts before routing traffic. | Gate reverse-proxy enablement on a 200 response from readiness to avoid 503s during boot. |

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
