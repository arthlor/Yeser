import { createClient } from 'npm:@supabase/supabase-js@2';

const ACTIVE_SUBSCRIPTION_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
]);

const INACTIVE_SUBSCRIPTION_EVENTS = new Set(['EXPIRATION']);
const DEFERRED_SUBSCRIPTION_EVENTS = new Set(['CANCELLATION']);

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 1. Verify webhook signature (using Authorization header with shared secret)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse webhook payload
    const payload = await req.json();
    const event = payload.event;

    if (!event) {
      return new Response('Invalid payload', { status: 400 });
    }

    const appUserId = event.app_user_id;
    if (typeof appUserId !== 'string' || appUserId.trim().length === 0) {
      return new Response('Invalid app_user_id', { status: 400 });
    }

    if (DEFERRED_SUBSCRIPTION_EVENTS.has(event.type)) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Ignored cancellation event; access remains active until expiration.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let isPro: boolean | null = null;
    if (ACTIVE_SUBSCRIPTION_EVENTS.has(event.type)) {
      isPro = true;
    } else if (INACTIVE_SUBSCRIPTION_EVENTS.has(event.type)) {
      isPro = false;
    }

    if (isPro === null) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Update database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('profiles').update({ is_pro: isPro }).eq('id', appUserId);

    if (error) {
      console.error('Failed to update profile:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, eventType: event.type, isPro }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
