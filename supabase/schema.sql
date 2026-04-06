-- ============================================================
-- SEOPIC — Schéma complet Supabase
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text        NOT NULL,
  client_name  text,
  client_email text        NOT NULL,
  status       text        NOT NULL DEFAULT 'Ouvert',
  priority     text        NOT NULL DEFAULT 'Moyenne',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_status_check   CHECK (status   IN ('Ouvert','En Cours','Résolu','Fermé')),
  CONSTRAINT tickets_priority_check CHECK (priority IN ('Haute','Moyenne','Basse'))
);

-- ── 2. REPLIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS replies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  from_role   text        NOT NULL DEFAULT 'client',
  author_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT replies_role_check CHECK (from_role IN ('client','admin'))
);

-- ── 3. ANALYSES (historique SEO) ────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email        text        NOT NULL,
  image_name        text,
  image_size        integer,
  seo_score         integer,
  alt_text          text,
  meta_title        text,
  meta_description  text,
  keywords          text[]      DEFAULT '{}',
  improvements      text[]      DEFAULT '{}',
  image_category    text,
  detected_content  text,
  tone              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── INDEX ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tickets_client_email_idx ON tickets(client_email);
CREATE INDEX IF NOT EXISTS tickets_status_idx       ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx   ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS replies_ticket_id_idx    ON replies(ticket_id);
CREATE INDEX IF NOT EXISTS analyses_user_email_idx  ON analyses(user_email);
CREATE INDEX IF NOT EXISTS analyses_created_at_idx  ON analyses(created_at DESC);

-- ── 4. USERS_SUBSCRIPTIONS (Gestion des abonnements SaaS) ──────
CREATE TABLE IF NOT EXISTS users_subscriptions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email           text        NOT NULL UNIQUE,
  plan_type            text        NOT NULL DEFAULT 'free',
  stripe_customer_id   text,
  stripe_subscription_id text,
  paypal_subscription_id text,
  payment_provider     text,
  status               text        NOT NULL DEFAULT 'active',
  analyses_per_month   integer     NOT NULL DEFAULT 10,
  analyses_used        integer     NOT NULL DEFAULT 0,
  can_analyze_images   boolean     DEFAULT true,
  can_analyze_multiple boolean     DEFAULT false,
  next_billing_date    timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_type_check CHECK (plan_type IN ('free','pro','enterprise')),
  CONSTRAINT status_check CHECK (status IN ('active','cancelled','past_due','incomplete'))
);

-- ── 5. SUBSCRIPTION_EVENTS (Historique des événements de paiement) ──
CREATE TABLE IF NOT EXISTS subscription_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email         text        NOT NULL REFERENCES users_subscriptions(user_email) ON DELETE CASCADE,
  event_type         text        NOT NULL,
  provider_event_id  text,
  provider           text,
  details            jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_type_check CHECK (event_type IN ('payment_success','payment_failed','subscription_created','subscription_updated','subscription_cancelled','invoice_created','invoice_failed'))
);

-- ── RLS (Row Level Security) ─────────────────────────────────
-- On utilise le service role côté serveur — RLS désactivée pour simplifier.
-- Si tu actives l'auth Supabase côté client, active RLS et adapte les policies.
ALTER TABLE tickets                DISABLE ROW LEVEL SECURITY;
ALTER TABLE replies                DISABLE ROW LEVEL SECURITY;
ALTER TABLE analyses               DISABLE ROW LEVEL SECURITY;
ALTER TABLE users_subscriptions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events    DISABLE ROW LEVEL SECURITY;

-- ── ADDITIONAL INDEXES ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS users_subscriptions_user_email_idx ON users_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS users_subscriptions_stripe_customer_idx ON users_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS users_subscriptions_paypal_idx ON users_subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS subscription_events_user_email_idx ON subscription_events(user_email);
CREATE INDEX IF NOT EXISTS subscription_events_created_at_idx ON subscription_events(created_at DESC);
