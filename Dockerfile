# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SUPABASE_URL="https://example-project.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="supabase-anon-key"
ARG SUPABASE_SERVICE_ROLE_KEY="supabase-service-role-key"
ARG STRIPE_SECRET_KEY="stripe-secret-key"
ARG STRIPE_WEBHOOK_SECRET="stripe-webhook-secret"
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="stripe-publishable-key"
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ARG NEXT_PUBLIC_SUPABASE_URL="https://example-project.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="supabase-anon-key"
ARG SUPABASE_SERVICE_ROLE_KEY="supabase-service-role-key"
ARG STRIPE_SECRET_KEY="stripe-secret-key"
ARG STRIPE_WEBHOOK_SECRET="stripe-webhook-secret"
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="stripe-publishable-key"
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 1001 nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nextjs /app/pnpm-lock.yaml ./pnpm-lock.yaml
EXPOSE 3000
USER nextjs
CMD ["dumb-init", "pnpm", "start"]
