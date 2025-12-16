// supabase/functions/handle-revenuecat-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
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

    // Check if it's an active subscription event
    // INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION imply active
    // CANCELLATION, EXPIRATION imply inactive (eventually)
    // RevenueCat sends the expiration date. trusted source.

    // However, the cleanest way is often trusting the `expiration_at_ms` if present
    // or inferring from type.

    const activeEvents = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'PRODUCT_CHANGE',
      'NON_RENEWING_PURCHASE',
    ];

    let isPro = false;

    if (activeEvents.includes(event.type)) {
      isPro = true;
    } else if (['CANCELLATION', 'EXPIRATION'].includes(event.type)) {
      isPro = false;
    } else {
      // Other events like TEST, etc. Ignore or keep current.
      // If we don't know, we shouldn't change it potentially?
      // But for safety, usually we rely on "period_type" or "entitlement_ids".
      // Let's keep it simple: if it's an event that grants access -> true.
      // If it takes away -> wait, cancellation doesn't mean immediate loss of access.
      // Expiration means loss. Cancellation means "won't renew".

      if (event.type === 'CANCELLATION') {
        // User still has access until expiration.
        // We should NOT set is_pro to false yet.
        // We only set to false on EXPIRATION.
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Ignored cancellation event, waiting for expiration',
          }),
          { status: 200 }
        );
      }

      if (event.type === 'EXPIRATION') {
        isPro = false;
      }
    }

    // Better logic: Use the presence of entitlements/expiration
    // But webhooks events are specific.
    // Let's stick to:
    // - INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, PRODUCT_CHANGE -> is_pro = true
    // - EXPIRATION -> is_pro = false

    if (
      !['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'EXPIRATION'].includes(
        event.type
      )
    ) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
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
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
