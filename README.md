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
SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
SUPABASE_DB_POOLER_URL="postgresql://db_user:db_password@project-ref.pooler.supabase.com:6543/postgres"
SUPABASE_POOLER_WARNING_THRESHOLD="0.7"
SUPABASE_POOLER_CRITICAL_THRESHOLD="0.9"

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

- Configure `SUPABASE_DB_POOLER_URL` to use the PgBouncer connection string from the
  Supabase dashboard (port `6543`, SSL required). Threshold variables control when
  connection saturation alerts fire.

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
