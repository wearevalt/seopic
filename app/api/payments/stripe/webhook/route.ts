import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/lib/subscription-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

type StripeEvent = Stripe.Event;

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.metadata?.email;
        const planType = (session.metadata?.planType as any) || 'pro';

        if (email) {
          await subscriptionService.createOrUpdateSubscription(
            email,
            planType,
            'stripe',
            session.subscription as string,
            'active'
          );

          await subscriptionService.logSubscriptionEvent(
            email,
            'subscription_created',
            'stripe',
            session.id,
            { subscriptionId: session.subscription }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;

        // Get customer email
        const customerObj = await stripe.customers.retrieve(customer);
        const email = (customerObj as Stripe.Customer).email;

        if (email) {
          const status =
            subscription.status === 'active' ? 'active' : 'past_due';

          await subscriptionService.updateSubscriptionStatus(email, status);
          await subscriptionService.logSubscriptionEvent(
            email,
            'subscription_updated',
            'stripe',
            event.id,
            { status: subscription.status }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;

        // Get customer email
        const customerObj = await stripe.customers.retrieve(customer);
        const email = (customerObj as Stripe.Customer).email;

        if (email) {
          await subscriptionService.updateSubscriptionStatus(email, 'cancelled');
          await subscriptionService.logSubscriptionEvent(
            email,
            'subscription_cancelled',
            'stripe',
            event.id,
            {}
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = invoice.customer as string;

        // Get customer email
        const customerObj = await stripe.customers.retrieve(customer);
        const email = (customerObj as Stripe.Customer).email;

        if (email) {
          await subscriptionService.updateSubscriptionStatus(email, 'past_due');
          await subscriptionService.logSubscriptionEvent(
            email,
            'payment_failed',
            'stripe',
            event.id,
            { invoiceId: invoice.id }
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
