# Share House Portal - Environment Setup Guide

Based on your terminal errors, you're missing several API keys and configurations. Here's what you need to set up:

## 🚨 **CRITICAL MISSING CONFIGURATIONS**

### 1. **SUPABASE DATABASE ISSUES**
```
Error: Could not find the table 'public.documents' in the schema cache
```

**Issue**: Your Supabase database is missing the required tables.

**Solution**: You need to run the database migrations or create the tables manually.

### 2. **DOCUMENSO API KEY**
```
DOCUMENSO_API_KEY is not configured
```

**Solution**: Get your Documenso API key from your Documenso instance.

### 3. **SUPABASE BROWSER CLIENT ISSUE**
```
Attempted import error: 'createClient' is not exported from '@/utils/supabase-browser'
```

**Issue**: Import/export mismatch in Supabase client configuration.

## 📋 **REQUIRED ENVIRONMENT VARIABLES**

Create a `.env.local` file in your project root with these variables:

### **SUPABASE (REQUIRED)**
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"
```

### **APPLICATION**
```bash
NEXT_PUBLIC_SITE_URL="http://localhost:3002"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
```

### **STRIPE (FOR PAYMENTS)**
```bash
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"
```

### **DOCUMENSO (FOR DOCUMENTS)**
```bash
DOCUMENSO_API_KEY="your_documenso_api_key"
DOCUMENSO_BASE_URL="https://your-documenso-instance.com"
```

### **CAL.COM (FOR BOOKINGS)**
```bash
CALCOM_BASE_URL="https://your-calcom-instance.com"
CALCOM_API_KEY="your_calcom_api_key"
```

### **GOOGLE CALENDAR (OPTIONAL)**
```bash
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_OWNER_REFRESH_TOKEN="your_google_refresh_token"
```

### **EMAIL SERVICE (OPTIONAL)**
```bash
RESEND_API_KEY="re_your_resend_api_key"
```

## 🛠️ **HOW TO GET THESE KEYS**

### **1. Supabase Setup**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy the Project URL and anon/public key
5. Copy the service_role key (keep this secret!)
6. Get JWT secret from Settings > API > JWT Settings

### **2. Stripe Setup** 
1. Go to [stripe.com](https://stripe.com)
2. Create account or sign in
3. Go to Developers > API keys
4. Copy publishable key and secret key (use test keys for development)
5. For webhook secret, use Stripe CLI: `stripe listen --forward-to localhost:3002/api/stripe/webhook`

### **3. Documenso Setup**
1. Set up Documenso instance (self-hosted or hosted)
2. Generate API key from your Documenso dashboard
3. Note your base URL

### **4. Cal.com Setup**
1. Set up Cal.com instance (self-hosted or hosted) 
2. Generate API key from Cal.com settings
3. Note your base URL

### **5. Google Calendar (Optional)**
1. Go to Google Cloud Console
2. Create project and enable Calendar API
3. Create OAuth 2.0 credentials
4. Generate refresh token

### **6. Resend (Optional)**
1. Go to [resend.com](https://resend.com)
2. Create account
3. Generate API key

## 🗄️ **DATABASE SETUP**

You also need to create the missing database tables in Supabase:

```sql
-- Documents table
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add more tables as needed for your application
```

## 🚀 **QUICK START**

1. Copy this template to `.env.local`
2. Fill in your actual API keys
3. Run database migrations or create tables manually in Supabase
4. Restart your development server: `npm run dev`

## ⚠️ **SECURITY NOTES**

- Never commit `.env.local` to git
- Use test/development keys for local development
- Keep production keys secure and separate
- Rotate keys regularly
