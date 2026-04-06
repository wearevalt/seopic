import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { subscriptionService } from '@/lib/subscription-service';
import { PLAN_CONFIGS } from '@/lib/types';
import { z } from 'zod';

const checkoutSchema = z.object({
  planType: z.enum(['pro', 'enterprise']),
});

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    rel: string;
    href: string;
  }>;
}

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

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 500 }
      );
    }

    // Get PayPal access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch(
      'https://api-m.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    );

    const tokenData: { access_token: string } = await tokenResponse.json();

    // Create billing plan
    const planData = {
      product_id: 'PROD_SEOPIC',
      name: plan.name,
      description: plan.features.join(', '),
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 means infinite
          pricing_scheme: {
            fixed_price: {
              value: (plan.price / 100).toString(), // Convert to EUR decimal
              currency_code: 'EUR',
            },
          },
        },
      ],
      payment_preferences: {
        setup_fee: {
          value: '0',
          currency_code: 'EUR',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    };

    const planResponse = await fetch(
      'https://api-m.paypal.com/v1/billing/plans',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      }
    );

    const plan_result: any = await planResponse.json();

    if (!plan_result.id) {
      throw new Error('Failed to create PayPal plan');
    }

    // Create subscription
    const subscriptionData = {
      plan_id: plan_result.id,
      subscriber: {
        name: {
          given_name: token.email.split('@')[0],
        },
        email_address: token.email,
      },
      application_context: {
        brand_name: 'Seopic',
        locale: 'en-US',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      },
    };

    const subscriptionResponse = await fetch(
      'https://api-m.paypal.com/v1/billing/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(subscriptionData),
      }
    );

    const subscription: any = await subscriptionResponse.json();

    if (!subscription.id) {
      throw new Error('Failed to create PayPal subscription');
    }

    // Find approval URL
    const approvalUrl = subscription.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL in PayPal response');
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl,
      planId: plan_result.id,
    });
  } catch (error) {
    console.error('PayPal checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
