import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    subscriber?: {
      email_address: string;
    };
    status?: string;
    billing_plan_id?: string;
    custom_id?: string;
    [key: string]: any;
  };
}

export async function POST(req: NextRequest) {
  try {
    const event: PayPalWebhookEvent = await req.json();

    // PayPal webhook verification could be added here
    // For now, we'll trust the webhook if it has valid structure

    const email = event.resource.subscriber?.email_address;
    const subscriptionId = event.resource.id;

    if (!email) {
      return NextResponse.json({ message: 'No email found' }, { status: 400 });
    }

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED': {
        // Extract plan type from custom_id or billing_plan_id
        const planType = (event.resource.custom_id || 'pro') as any;

        await subscriptionService.createOrUpdateSubscription(
          email,
          planType,
          'paypal',
          subscriptionId,
          'active'
        );

        await subscriptionService.logSubscriptionEvent(
          email,
          'subscription_created',
          'paypal',
          event.id,
          { subscriptionId }
        );
        break;
      }

      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscription = await subscriptionService.getUserSubscription(email);
        if (!subscription) {
          // Create subscription if it doesn't exist
          await subscriptionService.createOrUpdateSubscription(
            email,
            'pro',
            'paypal',
            subscriptionId,
            'active'
          );
        }

        await subscriptionService.logSubscriptionEvent(
          email,
          'subscription_created',
          'paypal',
          event.id,
          { status: 'activated' }
        );
        break;
      }

      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const status =
          event.resource.status === 'ACTIVE' ? 'active' : 'past_due';
        await subscriptionService.updateSubscriptionStatus(email, status);

        await subscriptionService.logSubscriptionEvent(
          email,
          'subscription_updated',
          'paypal',
          event.id,
          { status: event.resource.status }
        );
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        await subscriptionService.updateSubscriptionStatus(email, 'cancelled');

        await subscriptionService.logSubscriptionEvent(
          email,
          'subscription_cancelled',
          'paypal',
          event.id,
          {}
        );
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        await subscriptionService.updateSubscriptionStatus(email, 'past_due');

        await subscriptionService.logSubscriptionEvent(
          email,
          'subscription_updated',
          'paypal',
          event.id,
          { status: 'suspended' }
        );
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        await subscriptionService.logSubscriptionEvent(
          email,
          'payment_success',
          'paypal',
          event.id,
          { amount: event.resource.amount }
        );
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.FAILED': {
        await subscriptionService.logSubscriptionEvent(
          email,
          'payment_failed',
          'paypal',
          event.id,
          { status: event.resource.status }
        );
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    return NextResponse.json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
