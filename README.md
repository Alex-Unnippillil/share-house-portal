<a href="https://onyx-rho-pink.vercel.app/">
  <img alt="Onyx open graph image." src="https://quantumone.b-cdn.net/onyx-git/og-image.jpg">
  <h1 align="center">Onyx MVP Template</h1>
</a>

<a href="https://securityheaders.com/">
  <img alt="Onyx security score image." src="https://quantumone.b-cdn.net/onyx-git/onyx-security-score-ls.jpg">
  <h2 align="center">Onyx SecurityHeaders.com Score</h2>
</a>


### What is Onyx?
- Onyx is a turnkey, full stack NextJS 14+ progressive web app written in Typescript that includes role based access control (RBAC),
complete Supabase SSR Auth and DB integration, Zod validation, Tanstack React Query, Rust serverless function runtime and API, Markdown pages with ability to insert React components, React Hook form, and more. Fork, customize, and deploy on Vercel or elsewhere to have your MVP up and running in a few days or less. Stack details are below. 

### Stack and Features
- NextJS 14 App Router in Typescript 
- Supabase 
  - SSR Auth with
    - Fully configured email/password signup, login, oauth, PKCE and confirm routes 
    - middleware 
    - server actions
    - typed Auth & DB clients
    - readOnly userSession clients
  - Postgres DB with CRUD functions configured
    - User account and profile management configured 
    - RBAC configured admin dashboard with data visualization, members administration and todo lists
    - Contact form with toast, Zod validation, server side table insert  
- TanStack React Query, Table, and Dev Tools
  - Demo SSR with Supabase DB & cache helpers 
- Zod data validation, schemas, event handling.
- Shadcn-UI, Radix-UI primitives, Tailwind CSS
- Markdown pages with Next/MDX - create page.mdx and layout.tsx for each markdown page
- Next-PWA
- Next Compose Plugins  
- React Hook Form
- OpenAI playground UI
- Onboarding, signIn/signUp pages
- Podcast UI
- CookieButton component configured to work with Consent Manager from Termly free plan. Just create a free Termly account, add your Script tag on the app/layout page using Next Script and then add your CookieButton to your app/layout just above the ThemeProvider and just below your termly Script tag.  
- Custom Formik Components with MUI are not used in app but code is solid for use in a "MUI Base X TailwindCSS config". Onyx is NOT currently configured for MUI nor MUI Base X TailwindCSS. 
- Lucide React Icons with many brand SVGs ready for your props 
- More..

### API 
- [Rust runtime for Vercel Serverless Functions](https://github.com/vercel-community/rust)

### Getting started with Onyx:
- First, configure your environment
  - Create a file named .env.local in project root
  - Create a Supabase account and add the following to your env file
    - NEXT_PUBLIC_SUPABASE_ANON_KEY="Your supabase anon key"
    - SUPABASE_JWT_SECRET="Your supabase JWT secret"
    - NEXT_PUBLIC_SUPABASE_URL="Your supabase project URL"
    - SUPABASE_SERVIC_ROLE_KEY="Your supabase service role key"
  - Configure payments (optional)
    - STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    - STRIPE_DEFAULT_PRICE_ID or NEXT_PUBLIC_STRIPE_DEFAULT_AMOUNT (in CAD)
    - NEXT_PUBLIC_STRIPE_MODE ("payment" or "subscription")
    - NEXT_PUBLIC_STRIPE_SUCCESS_URL and NEXT_PUBLIC_STRIPE_CANCEL_URL
    - NEXT_PUBLIC_STRIPE_ALLOW_PROMOTION_CODES ("true" to enable)
    - NEXT_PUBLIC_STRIPE_TAX_RATES (comma separated list of tax rate IDs)
    - NEXT_PUBLIC_INTERAC_RECIPIENT_EMAIL and NEXT_PUBLIC_INTERAC_RECIPIENT_NAME

  - Ensure your Supabase tables match the tables and types found in '@/lib/supabase'.
  - Add authorized development and production URL's to Supabase URL config.

### Payments

- A new Billing page is available at `/account/billing` for authenticated users. It exposes Stripe Checkout for card payments and an Interac e-Transfer form that logs transfers for manual reconciliation.
- Configure the environment variables listed above to enable Stripe and Interac messaging. If you do not provide a Stripe price identifier or default amount the checkout button will be disabled by design.
- Create an `interac_payments` table in Supabase matching the schema defined in `lib/supabase.ts`. A minimal SQL definition looks like:

```sql
create table if not exists public.interac_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  sender_name text not null,
  sender_email text not null,
  amount_cents integer not null,
  currency text not null default 'CAD',
  reference text,
  message text,
  security_question text,
  security_answer_hash text,
  auto_deposit boolean not null default false,
  status text not null default 'pending',
  metadata jsonb,
  processed_at timestamptz,
  user_id uuid references auth.users(id)
);
```

### Run  
- Development server:

```bash
npm i && npm run dev
# or
yarn i && yarn run dev
# or
pnpm i && pnpm dev
# or
bun i && bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


### Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frmourey26%2Fonyx%2Ftree%2Fmain)


### Reference/Credit
- @chensokheng


### Tips/Support
<a href="https://www.buymeacoffee.com/rmoureyjr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="51" width="217"></a>
