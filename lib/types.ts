export type PlanType = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'incomplete';
export type PaymentProvider = 'stripe' | 'paypal';

export interface PlanConfig {
  type: PlanType;
  name: string;
  price: number; // in EUR cents
  billing_cycle: 'month' | 'year' | 'lifetime';
  analyses_per_month: number;
  can_analyze_images: boolean;
  can_analyze_multiple: boolean;
  features: string[];
}

export interface UserSubscription {
  id: string;
  user_email: string;
  plan_type: PlanType;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  paypal_subscription_id?: string;
  payment_provider?: PaymentProvider;
  status: SubscriptionStatus;
  analyses_per_month: number;
  analyses_used: number;
  can_analyze_images: boolean;
  can_analyze_multiple: boolean;
  next_billing_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionEvent {
  id: string;
  user_email: string;
  event_type: string;
  provider_event_id?: string;
  provider?: PaymentProvider;
  details?: Record<string, unknown>;
  created_at: string;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    type: 'free',
    name: 'Découverte',
    price: 0,
    billing_cycle: 'lifetime',
    analyses_per_month: 5,
    can_analyze_images: true,
    can_analyze_multiple: false,
    features: [
      'Analyse d\'images SEO',
      '5 analyses par mois',
      'Résultats basiques',
      'Support communautaire',
    ],
  },
  pro: {
    type: 'pro',
    name: 'Pro',
    price: 2900, // €29.00
    billing_cycle: 'month',
    analyses_per_month: 100,
    can_analyze_images: true,
    can_analyze_multiple: true,
    features: [
      'Analyse d\'images illimitée',
      '100 analyses par mois',
      'Multi-image en une seule requête',
      'Données réelles des mots-clés',
      'Analyse de site web complète',
      'Support prioritaire par email',
      'Rapports détaillés',
    ],
  },
  enterprise: {
    type: 'enterprise',
    name: 'Entreprise',
    price: 0, // Custom pricing
    billing_cycle: 'month',
    analyses_per_month: 999999, // Unlimited
    can_analyze_images: true,
    can_analyze_multiple: true,
    features: [
      'Analyses illimitées',
      'Intégration API personnalisée',
      'Analyse de site web avancée',
      'Données en temps réel',
      'Support dédié 24/7',
      'Rapports personnalisés',
      'Infrastructure dédiée',
    ],
  },
};
