import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Stripe from 'stripe';
import { subscriptionService } from '@/lib/subscription-service';
import { PLAN_CONFIGS } from '@/lib/types';
import { z } from 'zod';

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

const checkoutSchema = z.object({
  planType: z.enum(['pro', 'enterprise']),
});

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || !token.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planType } = checkoutSchema.parse(body);

    const plan = PLAN_CONFIGS[planType];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create Stripe customer
    const subscription = await subscriptionService.getUserSubscription(token.email);
    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: token.email,
        metadata: {
          app: 'seopic',
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: plan.name,
              description: plan.features.join(', '),
            },
            unit_amount: plan.price,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: {
        planType,
        email: token.email,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
